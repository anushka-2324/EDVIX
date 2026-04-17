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
const ATTENDANCE_EXTENDED_COLUMNS = ["attendance_date", "status", "proximity_distance_m", "marked_by"] as const;

function isLegacyClassesError(error: unknown) {
  return [...CLASS_EXTENDED_COLUMNS, ...CLASS_PROXIMITY_COLUMNS].some((column) =>
    isMissingColumnError(error, "classes", column)
  );
}

function isLegacyClassProximityError(error: unknown) {
  return CLASS_PROXIMITY_COLUMNS.some((column) => isMissingColumnError(error, "classes", column));
}

function isLegacyAttendanceError(error: unknown) {
  return ATTENDANCE_EXTENDED_COLUMNS.some((column) => isMissingColumnError(error, "attendance", column));
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
    const noProximityRes = await supabase
      .from("classes")
      .select("id, name, qr_code, active, subject, current_topic, qr_updated_at, qr_expires_at")
      .order("name");

    if (!noProximityRes.error) {
      return (noProximityRes.data ?? []).map((classRow) => ({
        ...(classRow as Omit<CampusClass, "qr_origin_lat" | "qr_origin_lng" | "qr_generated_by">),
        qr_origin_lat: null,
        qr_origin_lng: null,
        qr_generated_by: null,
      }));
    }

    if (isMissingTableError(noProximityRes.error, "classes")) {
      return [];
    }

    if (!isLegacyClassesError(noProximityRes.error)) {
      throw toDbError(noProximityRes.error, "Unable to load classes", "classes");
    }

    const subjectTopicRes = await supabase
      .from("classes")
      .select("id, name, qr_code, active, subject, current_topic")
      .order("name");

    if (!subjectTopicRes.error) {
      return (subjectTopicRes.data ?? []).map((classRow) => ({
        ...(classRow as Omit<CampusClass, "qr_updated_at" | "qr_expires_at" | "qr_origin_lat" | "qr_origin_lng" | "qr_generated_by">),
        qr_updated_at: null,
        qr_expires_at: null,
        qr_origin_lat: null,
        qr_origin_lng: null,
        qr_generated_by: null,
      }));
    }

    if (isMissingTableError(subjectTopicRes.error, "classes")) {
      return [];
    }

    if (!isLegacyClassesError(subjectTopicRes.error)) {
      throw toDbError(subjectTopicRes.error, "Unable to load classes", "classes");
    }

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
  const normalize = (
    rows: Array<Record<string, unknown>>,
    options?: { fallbackSubject?: string; forceNullTopic?: boolean; fallbackStatus?: "present" | "absent" }
  ) => {
    return rows.map((entry) => {
      const classRaw = entry.class;
      const classData = Array.isArray(classRaw) ? classRaw[0] : classRaw;
      const classRecord = classData && typeof classData === "object" ? (classData as Record<string, unknown>) : null;

      return {
        id: entry.id as string,
        user_id: entry.user_id as string,
        class_id: entry.class_id as string,
        timestamp: entry.timestamp as string,
        attendance_date: (entry.attendance_date as string | undefined) ?? undefined,
        status: ((entry.status as "present" | "absent" | undefined) ?? options?.fallbackStatus ?? "present") as
          | "present"
          | "absent",
        class: classRecord
          ? {
              id: classRecord.id as string,
              name: classRecord.name as string,
              subject: (classRecord.subject as string | undefined) ?? options?.fallbackSubject ?? "General",
              current_topic: options?.forceNullTopic ? null : ((classRecord.current_topic as string | null | undefined) ?? null),
            }
          : undefined,
      } as AttendanceLog;
    });
  };

  let fullQuery = supabase
    .from("attendance")
    .select("id, user_id, class_id, timestamp, attendance_date, status, class:classes(id, name, subject, current_topic)")
    .order("timestamp", { ascending: false })
    .limit(30);

  if (role === "student") {
    fullQuery = fullQuery.eq("user_id", userId);
  }

  const fullRes = await fullQuery;

  if (!fullRes.error) {
    return normalize((fullRes.data ?? []) as Array<Record<string, unknown>>);
  }

  if (isMissingTableError(fullRes.error, "attendance") || isMissingTableError(fullRes.error, "classes")) {
    return [];
  }

  if (!isLegacyClassesError(fullRes.error) && !isLegacyAttendanceError(fullRes.error)) {
    throw toDbError(fullRes.error, "Unable to load attendance logs");
  }

  let subjectStatusQuery = supabase
    .from("attendance")
    .select("id, user_id, class_id, timestamp, attendance_date, status, class:classes(id, name, subject)")
    .order("timestamp", { ascending: false })
    .limit(30);

  if (role === "student") {
    subjectStatusQuery = subjectStatusQuery.eq("user_id", userId);
  }

  const subjectStatusRes = await subjectStatusQuery;

  if (!subjectStatusRes.error) {
    return normalize((subjectStatusRes.data ?? []) as Array<Record<string, unknown>>, { forceNullTopic: true });
  }

  if (isMissingTableError(subjectStatusRes.error, "attendance") || isMissingTableError(subjectStatusRes.error, "classes")) {
    return [];
  }

  if (!isLegacyClassesError(subjectStatusRes.error) && !isLegacyAttendanceError(subjectStatusRes.error)) {
    throw toDbError(subjectStatusRes.error, "Unable to load attendance logs");
  }

  let subjectOnlyQuery = supabase
    .from("attendance")
    .select("id, user_id, class_id, timestamp, class:classes(id, name, subject)")
    .order("timestamp", { ascending: false })
    .limit(30);

  if (role === "student") {
    subjectOnlyQuery = subjectOnlyQuery.eq("user_id", userId);
  }

  const subjectOnlyRes = await subjectOnlyQuery;

  if (!subjectOnlyRes.error) {
    return normalize((subjectOnlyRes.data ?? []) as Array<Record<string, unknown>>, {
      forceNullTopic: true,
      fallbackStatus: "present",
    });
  }

  if (isMissingTableError(subjectOnlyRes.error, "attendance") || isMissingTableError(subjectOnlyRes.error, "classes")) {
    return [];
  }

  if (!isLegacyClassesError(subjectOnlyRes.error) && !isLegacyAttendanceError(subjectOnlyRes.error)) {
    throw toDbError(subjectOnlyRes.error, "Unable to load attendance logs");
  }

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

  return normalize((legacyRes.data ?? []) as Array<Record<string, unknown>>, {
    fallbackSubject: "General",
    forceNullTopic: true,
    fallbackStatus: "present",
  });
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

  const noProximityInsert = await supabase
    .from("classes")
    .insert({
      name,
      subject,
      current_topic: topic,
      qr_code: qrToken,
      qr_updated_at: nowIso,
      qr_expires_at: expiresAt,
      active: true,
    })
    .select("id, name, qr_code, active, subject, current_topic, qr_updated_at, qr_expires_at")
    .single();

  if (!noProximityInsert.error && noProximityInsert.data) {
    return {
      ...(noProximityInsert.data as Omit<CampusClass, "qr_origin_lat" | "qr_origin_lng" | "qr_generated_by">),
      qr_origin_lat: null,
      qr_origin_lng: null,
      qr_generated_by: options.generatedByUserId,
    };
  }

  if (noProximityInsert.error && !isLegacyClassesError(noProximityInsert.error)) {
    throw toDbError(noProximityInsert.error, "Unable to create class session", "classes");
  }

  const subjectTopicInsert = await supabase
    .from("classes")
    .insert({
      name,
      subject,
      current_topic: topic,
      qr_code: qrToken,
      active: true,
    })
    .select("id, name, qr_code, active, subject, current_topic")
    .single();

  if (!subjectTopicInsert.error && subjectTopicInsert.data) {
    return {
      ...(subjectTopicInsert.data as Omit<CampusClass, "qr_updated_at" | "qr_expires_at" | "qr_origin_lat" | "qr_origin_lng" | "qr_generated_by">),
      qr_updated_at: null,
      qr_expires_at: null,
      qr_origin_lat: null,
      qr_origin_lng: null,
      qr_generated_by: options.generatedByUserId,
    };
  }

  if (subjectTopicInsert.error && !isLegacyClassesError(subjectTopicInsert.error)) {
    throw toDbError(subjectTopicInsert.error, "Unable to create class session", "classes");
  }

  const legacyInsert = await supabase
    .from("classes")
    .insert({
      name,
      qr_code: qrToken,
      active: true,
    })
    .select("id, name, qr_code, active")
    .single();

  if (legacyInsert.error || !legacyInsert.data) {
    throw toDbError(legacyInsert.error, "Unable to create class session", "classes");
  }

  return withClassDefaults(legacyInsert.data as LegacyClassRow);
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

    if (customUpdate.error && isLegacyClassProximityError(customUpdate.error)) {
      const noProximityUpdate = await supabase
        .from("classes")
        .update({
          qr_code: qrToken,
          subject,
          current_topic: topic,
          qr_updated_at: nowIso,
          qr_expires_at: expiresAt,
          active: true,
        })
        .eq("id", classId)
        .select("id, name, qr_code, active, subject, current_topic, qr_updated_at, qr_expires_at")
        .single();

      if (!noProximityUpdate.error && noProximityUpdate.data) {
        return {
          ...(noProximityUpdate.data as Omit<CampusClass, "qr_origin_lat" | "qr_origin_lng" | "qr_generated_by">),
          qr_origin_lat: null,
          qr_origin_lng: null,
          qr_generated_by: options.generatedByUserId,
        };
      }

      if (noProximityUpdate.error && !isLegacyClassesError(noProximityUpdate.error)) {
        throw toDbError(noProximityUpdate.error, "Unable to rotate QR code", "classes");
      }
    }

    const subjectTopicUpdate = await supabase
      .from("classes")
      .update({
        qr_code: qrToken,
        subject,
        current_topic: topic,
        active: true,
      })
      .eq("id", classId)
      .select("id, name, qr_code, active, subject, current_topic")
      .single();

    if (!subjectTopicUpdate.error && subjectTopicUpdate.data) {
      return {
        ...(subjectTopicUpdate.data as Omit<CampusClass, "qr_updated_at" | "qr_expires_at" | "qr_origin_lat" | "qr_origin_lng" | "qr_generated_by">),
        qr_updated_at: null,
        qr_expires_at: expiresAt,
        qr_origin_lat: null,
        qr_origin_lng: null,
        qr_generated_by: options.generatedByUserId,
      };
    }

    if (subjectTopicUpdate.error && !isLegacyClassesError(subjectTopicUpdate.error)) {
      throw toDbError(subjectTopicUpdate.error, "Unable to rotate QR code", "classes");
    }
  }

  const legacyUpdate = await supabase
    .from("classes")
    .update({
      qr_code: qrToken,
      active: true,
    })
    .eq("id", classId)
    .select("id, name, qr_code, active")
    .single();

  if (legacyUpdate.error || !legacyUpdate.data) {
    throw toDbError(legacyUpdate.error, "Unable to rotate QR code", "classes");
  }

  const legacyClass = withClassDefaults(legacyUpdate.data as LegacyClassRow);

  return {
    ...legacyClass,
    subject,
    current_topic: topic,
    qr_updated_at: nowIso,
    qr_expires_at: expiresAt,
    qr_origin_lat: null,
    qr_origin_lng: null,
    qr_generated_by: options.generatedByUserId,
  };
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

  const hasQrOrigin =
    typeof classRow.qr_origin_lat === "number" && typeof classRow.qr_origin_lng === "number";

  if (hasQrOrigin) {
    const distanceMeters = calculateDistanceMeters(
      latitude,
      longitude,
      classRow.qr_origin_lat as number,
      classRow.qr_origin_lng as number
    );

    if (distanceMeters > ATTENDANCE_PROXIMITY_RADIUS_METERS) {
      throw new Error(
        `You must be within ${ATTENDANCE_PROXIMITY_RADIUS_METERS} meters of the faculty QR location to mark attendance`
      );
    }
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
    .insert({ user_id: userId, class_id: classRow.id, marked_by: classRow.qr_generated_by ?? null })
    .select("id, user_id, class_id, timestamp")
    .single();

  if (error && isLegacyAttendanceError(error)) {
    const { data: legacyData, error: legacyError } = await supabase
      .from("attendance")
      .insert({ user_id: userId, class_id: classRow.id })
      .select("id, user_id, class_id, timestamp")
      .single();

    if (legacyError) throw toDbError(legacyError, "Unable to mark attendance", "attendance");
    return legacyData;
  }

  if (error) throw toDbError(error, "Unable to mark attendance", "attendance");

  return data;
}

export async function getAttendanceStudents(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("role", "student")
    .order("name", { ascending: true });

  if (error) {
    if (isMissingTableError(error, "users")) {
      return [];
    }

    throw toDbError(error, "Unable to load students list", "users");
  }

  return (data ?? []) as Array<{ id: string; name: string; email: string }>;
}

type ManualAttendanceOptions = {
  classId: string;
  studentId: string;
  status: "present" | "absent";
  attendanceDate?: string;
};

export async function markAttendanceByFaculty(
  supabase: SupabaseClient,
  options: ManualAttendanceOptions
) {
  const dayStart = options.attendanceDate
    ? startOfDay(new Date(options.attendanceDate)).toISOString()
    : startOfDay(new Date()).toISOString();

  const dayEndDate = new Date(dayStart);
  dayEndDate.setUTCDate(dayEndDate.getUTCDate() + 1);
  const dayEnd = dayEndDate.toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("attendance")
    .select("id")
    .eq("user_id", options.studentId)
    .eq("class_id", options.classId)
    .gte("timestamp", dayStart)
    .lt("timestamp", dayEnd)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw toDbError(existingError, "Unable to check existing attendance", "attendance");
  }

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from("attendance")
      .update({ status: options.status })
      .eq("id", existing.id)
      .select("id, user_id, class_id, timestamp, status")
      .single();

    if (updateError) {
      if (isMissingColumnError(updateError, "attendance", "status")) {
        if (options.status === "absent") {
          throw new Error("Absent marking requires latest schema. Please run supabase/schema.sql");
        }

        const { data: legacyUpdated, error: legacyUpdateError } = await supabase
          .from("attendance")
          .update({ timestamp: new Date().toISOString() })
          .eq("id", existing.id)
          .select("id, user_id, class_id, timestamp")
          .single();

        if (legacyUpdateError) {
          throw toDbError(legacyUpdateError, "Unable to update attendance", "attendance");
        }

        return {
          ...legacyUpdated,
          status: "present" as const,
        };
      }

      throw toDbError(updateError, "Unable to update attendance", "attendance");
    }

    return updated;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("attendance")
    .insert({
      user_id: options.studentId,
      class_id: options.classId,
      timestamp: new Date().toISOString(),
      status: options.status,
    })
    .select("id, user_id, class_id, timestamp, status")
    .single();

  if (insertError) {
    if (isMissingColumnError(insertError, "attendance", "status")) {
      if (options.status === "absent") {
        throw new Error("Absent marking requires latest schema. Please run supabase/schema.sql");
      }

      const { data: legacyInserted, error: legacyInsertError } = await supabase
        .from("attendance")
        .insert({
          user_id: options.studentId,
          class_id: options.classId,
          timestamp: new Date().toISOString(),
        })
        .select("id, user_id, class_id, timestamp")
        .single();

      if (legacyInsertError) {
        throw toDbError(legacyInsertError, "Unable to mark attendance", "attendance");
      }

      return {
        ...legacyInserted,
        status: "present" as const,
      };
    }

    throw toDbError(insertError, "Unable to mark attendance", "attendance");
  }

  return inserted;
}
