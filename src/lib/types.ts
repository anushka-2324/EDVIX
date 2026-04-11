export type UserRole = "student" | "faculty" | "admin" | "bus_driver";

export type AlertType = "class" | "bus" | "announcement";

export type IssueStatus = "pending" | "resolved";

export type AttendanceStatus = "present" | "absent";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type CampusClass = {
  id: string;
  name: string;
  qr_code: string;
  active: boolean;
  subject: string;
  current_topic: string | null;
  qr_updated_at: string | null;
  qr_expires_at: string | null;
};

export type AttendanceLog = {
  id: string;
  user_id: string;
  class_id: string;
  timestamp: string;
  attendance_date?: string;
  status: AttendanceStatus;
  class?: Pick<CampusClass, "id" | "name" | "subject" | "current_topic">;
  student?: Pick<UserProfile, "id" | "name" | "email">;
};

export type FacultyAttendanceSheetRow = {
  student_id: string;
  student_name: string;
  student_email: string;
  status: AttendanceStatus;
};

export type PickupSource = "college" | "school";

export type Bus = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  updated_at: string;
  pickup_area: string | null;
  pickup_source: PickupSource | null;
  driver_id: string | null;
};

export type TransportPreference = {
  user_id: string;
  preferred_bus_id: string | null;
  preferred_area: string | null;
  preferred_source: PickupSource | null;
  updated_at: string;
};

export type Alert = {
  id: string;
  title: string;
  message: string;
  type: AlertType;
  created_at: string;
};

export type Issue = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: IssueStatus;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  reporter?: Pick<UserProfile, "id" | "name" | "email">;
};

export type Notification = {
  id: string;
  user_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

export type ParkingLot = {
  id: string;
  zone: string;
  total_slots: number;
  occupied_slots: number;
  updated_at: string;
};

export type ParkingAvailabilitySummary = {
  total: number;
  occupied: number;
  available: number;
  utilizationPercent: number;
};

export type CampusLocation = {
  id: string;
  name: string;
  type: "academic" | "hostel" | "transport" | "admin";
  lat: number;
  lng: number;
  description: string;
};
