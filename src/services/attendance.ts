import { startOfDay } from "date-fns";
import { ATTENDANCE_PROXIMITY_RADIUS_METERS, calculateDistanceMeters, randomToken } from "@/lib/utils";
import { type UserRole, type CampusClass, type AttendanceLog } from "@/lib/types";
import { isMissingColumnError, isMissingTableError, toDbError } from "@/lib/supabase/errors";

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createServerSupabaseClient>>;

type RotateQrOptions = {
  subject?: string;
  topic?: string | null;
  expiresInMinutes?: number;
  latitude: number;
  longitude: number;
  generatedByUserId: string;
};

type CreateClassSessionOptions = {
  name: string;
  subject?: string;
  topic?: string | null;
  expiresInMinutes?: number;
  latitude: number;
  longitude: number;
  generatedByUserId: string;
};

type LegacyClassRow = {
  id: string;
  name: string;
  qr_code: string;
  active: boolean;
};

const CLASS_EXTENDED_COLUMNS = ["subject", "current_topic", "qr_updated_at", "qr_expires_at"] as const;
const CLASS_PROXIMITY_COLUMNS = ["qr_origin_lat", "qr_origin_lng", "qr_generated_by"] as const;

function isLegacyClassesError(error: unknown) {
  return [...CLASS_EXTENDED_COLUMNS, ...CLASS_PROXIMITY_COLUMNS].some((column) =>
    isMissingColumnError(error, "classes", column)
  );
}

function withClassDefaults(classRow: LegacyClassRow): CampusClass {
  return {
    ...classRow,
    subject: "General",
    current_topic: null,
    qr_updated_at: null,
    qr_expires_at: null,
    qr_origin_lat: null,
    qr_origin_lng: null,
    qr_generated_by: null,
  };
}

function tokenPart(input: string, fallback: string) {
  const normalized = input
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 6);

  return normalized || fallback;
}

function buildAttendanceToken(classId: string, subject: string, topic: string | null) {
  const classPart = tokenPart(classId.slice(0, 4), "CLS");
  const subjectPart = tokenPart(subject, "SUB");
  const topicPart = tokenPart(topic ?? "", "TOPIC");

  return `${classPart}-${subjectPart}-${topicPart}-${randomToken(6)}`;
}

export async function getClasses(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("classes")
    .select(
      "id, name, qr_code, active, subject, current_topic, qr_updated_at, qr_expires_at, qr_origin_lat, qr_origin_lng, qr_generated_by"
    )
    .order("name");

  if (!error) {
    return (data ?? []) as CampusClass[];
  }

  if (isMissingTableError(error, "classes")) {
    return [];
  }

  if (isLegacyClassesError(error)) {
    const legacyRes = await supabase.from("classes").select("id, name, qr_code, active").order("name");
    if (legacyRes.error) {
      if (isMissingTableError(legacyRes.error, "classes")) {
        return [];
      }

      throw toDbError(legacyRes.error, "Unable to load classes", "classes");
    }

    return (legacyRes.data ?? []).map((classRow) => withClassDefaults(classRow as LegacyClassRow));
  }

  throw toDbError(error, "Unable to load classes", "classes");
}

export async function getAttendanceLogs(
  supabase: SupabaseClient,
  userId: string,
  role: UserRole
) {
  let query = supabase
    .from("attendance")
    .select("id, user_id, class_id, timestamp, class:classes(id, name, subject, current_topic)")
    .order("timestamp", { ascending: false })
    .limit(30);

  if (role === "student") {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (!error) {
    const normalized = (data ?? []).map((entry) => {
      const classData = Array.isArray(entry.class) ? entry.class[0] : entry.class;

      return {
        ...entry,
        class: classData
          ? {
              id: classData.id,
              name: classData.name,
              subject: classData.subject,
              current_topic: classData.current_topic,
            }
          : undefined,
      };
    });

    return normalized as AttendanceLog[];
  }

  if (isMissingTableError(error, "attendance") || isMissingTableError(error, "classes")) {
    return [];
  }

  if (isLegacyClassesError(error)) {
    let legacyQuery = supabase
      .from("attendance")
      .select("id, user_id, class_id, timestamp, class:classes(id, name)")
      .order("timestamp", { ascending: false })
      .limit(30);

    if (role === "student") {
      legacyQuery = legacyQuery.eq("user_id", userId);
    }

    const legacyRes = await legacyQuery;

    if (legacyRes.error) {
      if (isMissingTableError(legacyRes.error, "attendance") || isMissingTableError(legacyRes.error, "classes")) {
        return [];
      }

      throw toDbError(legacyRes.error, "Unable to load attendance logs");
    }

    const normalized = (legacyRes.data ?? []).map((entry) => {
      const classData = Array.isArray(entry.class) ? entry.class[0] : entry.class;

      return {
        ...entry,
        class: classData
          ? {
              id: classData.id,
              name: classData.name,
              subject: "General",
              current_topic: null,
            }
          : undefined,
      };
    });

    return normalized as AttendanceLog[];
  }

  throw toDbError(error, "Unable to load attendance logs");
}

export async function createClassSession(
  supabase: SupabaseClient,
  options: CreateClassSessionOptions
) {
  const name = options.name.trim();

  if (!name) {
    throw new Error("Class name is required");
  }

  const subject = options.subject?.trim() || "General";
  const topic = options.topic?.trim() || null;
  const expiresInMinutes = options.expiresInMinutes ?? 45;
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000).toISOString();
  const qrToken = buildAttendanceToken(randomToken(4), subject, topic);

  const customInsert = await supabase
    .from("classes")
    .insert({
      name,
      subject,
      current_topic: topic,
      qr_code: qrToken,
      qr_updated_at: nowIso,
      qr_expires_at: expiresAt,
      qr_origin_lat: options.latitude,
      qr_origin_lng: options.longitude,
      qr_generated_by: options.generatedByUserId,
      active: true,
    })
    .select(
      "id, name, qr_code, active, subject, current_topic, qr_updated_at, qr_expires_at, qr_origin_lat, qr_origin_lng, qr_generated_by"
    )
    .single();

  if (!customInsert.error && customInsert.data) {
    return customInsert.data as CampusClass;
  }

  if (customInsert.error && !isLegacyClassesError(customInsert.error)) {
    throw toDbError(customInsert.error, "Unable to create class session", "classes");
  }

  throw new Error("Attendance proximity enforcement requires the latest database migration");
}

export async function rotateClassQrCode(
  supabase: SupabaseClient,
  classId: string,
  options: RotateQrOptions
) {
  let supportsCustomColumns = true;
  let currentSubject = "General";

  const classRes = await supabase.from("classes").select("id, subject").eq("id", classId).single();

  if (classRes.error || !classRes.data) {
    if (isLegacyClassesError(classRes.error)) {
      supportsCustomColumns = false;
      const legacyClass = await supabase.from("classes").select("id").eq("id", classId).single();
      if (legacyClass.error || !legacyClass.data) {
        throw new Error("Class not found");
      }
    } else {
      throw new Error("Class not found");
    }
  } else {
    currentSubject = classRes.data.subject ?? "General";
  }

  const subject = options.subject?.trim() || currentSubject;
  const topic = options.topic?.trim() || null;
  const expiresInMinutes = options.expiresInMinutes ?? 45;
  const qrToken = buildAttendanceToken(classId, subject, topic);
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000).toISOString();

  if (supportsCustomColumns) {
    const customUpdate = await supabase
      .from("classes")
      .update({
      qr_code: qrToken,
      subject,
      current_topic: topic,
      qr_updated_at: nowIso,
      qr_expires_at: expiresAt,
      qr_origin_lat: options.latitude,
      qr_origin_lng: options.longitude,
      qr_generated_by: options.generatedByUserId,
      active: true,
    })
    .eq("id", classId)
    .select(
      "id, name, qr_code, active, subject, current_topic, qr_updated_at, qr_expires_at, qr_origin_lat, qr_origin_lng, qr_generated_by"
    )
    .single();

    if (!customUpdate.error && customUpdate.data) {
      return customUpdate.data as CampusClass;
    }

    if (customUpdate.error && !isLegacyClassesError(customUpdate.error)) {
      throw toDbError(customUpdate.error, "Unable to rotate QR code", "classes");
    }
  }

  throw new Error("Attendance proximity enforcement requires the latest database migration");
}

export async function markAttendance(
  supabase: SupabaseClient,
  userId: string,
  classId: string | null,
  qrToken: string,
  latitude: number,
  longitude: number
) {
  const normalizedToken = qrToken.trim();

  let classQuery = supabase
    .from("classes")
    .select("id, name, qr_code, active, subject, current_topic, qr_expires_at, qr_origin_lat, qr_origin_lng, qr_generated_by");

  classQuery = classId ? classQuery.eq("id", classId) : classQuery.eq("qr_code", normalizedToken);

  const classRes = await classQuery.single();

  let classRow:
    | {
        id: string;
        name: string;
        qr_code: string;
        active: boolean;
        qr_expires_at?: string | null;
        qr_origin_lat?: number | null;
        qr_origin_lng?: number | null;
        qr_generated_by?: string | null;
      }
    | null = null;

  if (!classRes.error && classRes.data) {
    classRow = classRes.data;
  } else if (classRes.error && isLegacyClassesError(classRes.error)) {
    let fallbackClassQuery = supabase.from("classes").select("id, name, qr_code, active");
    fallbackClassQuery = classId
      ? fallbackClassQuery.eq("id", classId)
      : fallbackClassQuery.eq("qr_code", normalizedToken);

    const fallbackRes = await fallbackClassQuery.single();

    if (fallbackRes.error || !fallbackRes.data) {
      throw new Error("Class not found");
    }

    classRow = withClassDefaults(fallbackRes.data as LegacyClassRow);
  }

  if (!classRow) {
    throw new Error("Class not found");
  }

  if (!classRow.active) {
    throw new Error("Class attendance is not active");
  }

  if (classRow.qr_code !== normalizedToken) {
    throw new Error("Invalid QR token for selected class");
  }

  if (classRow.qr_expires_at && new Date(classRow.qr_expires_at).getTime() < Date.now()) {
    throw new Error("QR token expired. Ask faculty to generate a new one");
  }

  if (
    typeof classRow.qr_origin_lat !== "number" ||
    typeof classRow.qr_origin_lng !== "number" ||
    !classRow.qr_generated_by
  ) {
    throw new Error("QR origin unavailable. Ask faculty to refresh the classroom QR");
  }

  const distanceMeters = calculateDistanceMeters(
    latitude,
    longitude,
    classRow.qr_origin_lat,
    classRow.qr_origin_lng
  );

  if (distanceMeters > ATTENDANCE_PROXIMITY_RADIUS_METERS) {
    throw new Error(
      `You must be within ${ATTENDANCE_PROXIMITY_RADIUS_METERS} meters of the faculty QR location to mark attendance`
    );
  }

  const today = startOfDay(new Date()).toISOString();

  const { data: existing, error: checkError } = await supabase
    .from("attendance")
    .select("id")
    .eq("user_id", userId)
    .eq("class_id", classRow.id)
    .gte("timestamp", today)
    .limit(1)
    .maybeSingle();

  if (checkError) throw toDbError(checkError, "Unable to verify attendance", "attendance");
  if (existing) {
    throw new Error("Attendance already marked for this class today");
  }

  const { data, error } = await supabase
    .from("attendance")
    .insert({ user_id: userId, class_id: classRow.id, marked_by: classRow.qr_generated_by })
    .select("id, user_id, class_id, timestamp")
    .single();

  if (error) throw toDbError(error, "Unable to mark attendance", "attendance");

  return data;
}
