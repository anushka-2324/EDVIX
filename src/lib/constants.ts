import { type CampusLocation, type CampusPreset } from "@/lib/types";

export const APP_NAME = "EDVIX – Smart Campus Ecosystem";

const KBP_VASHI_LOCATIONS: CampusLocation[] = [
  {
    id: "kbp-main-gate",
    name: "Main Gate",
    type: "transport",
    lat: 19.0773,
    lng: 72.9974,
    description: "Primary college entry point from Vashi side",
    navigationHint: "Enter from the front security gate and continue straight into the central campus lane.",
  },
  {
    id: "kbp-admin-building",
    name: "Admin Building",
    type: "admin",
    lat: 19.0769,
    lng: 72.9973,
    description:
      "Ground: Admin offices. 2nd floor: Computer Science Lab and IT Lab. 3rd floor: BMS Staff Room.",
    navigationHint: "This block sits just inside the campus spine, slightly south of the main gate.",
  },
  {
    id: "kbp-library-building",
    name: "Library Building",
    type: "academic",
    lat: 19.0765,
    lng: 72.9978,
    description: "Main library and reading section",
    navigationHint: "Keep to the east-side walkway after the admin block to reach the library entrance.",
  },
  {
    id: "kbp-management-building",
    name: "Management Building",
    type: "academic",
    lat: 19.0761,
    lng: 72.9971,
    description: "BMS and management classrooms",
    navigationHint: "Move toward the southwest academic wing from the admin building side.",
  },
  {
    id: "kbp-ground",
    name: "College Ground",
    type: "academic",
    lat: 19.0767,
    lng: 72.9968,
    description: "Open ground attached near the back side of Admin Building",
    navigationHint: "Walk around the rear side of the admin block to access the open ground.",
  },
  {
    id: "kbp-admin-parking",
    name: "Parking (Back of Admin Building)",
    type: "transport",
    lat: 19.0764,
    lng: 72.9971,
    description: "Student and staff parking area behind Admin Building",
    navigationHint: "Use the lane beside the admin building and continue toward the rear parking section.",
  },
  {
    id: "kbp-bus-stop",
    name: "Campus Bus Stop",
    type: "transport",
    lat: 19.0775,
    lng: 72.9979,
    description: "Pickup and drop point for college buses",
    navigationHint: "The bus stop is near the northeastern edge of campus beside the entry road.",
  },
];

const DEMO_CAMPUS_LOCATIONS: CampusLocation[] = [
  {
    id: "demo-admin-block",
    name: "Admin Block",
    type: "admin",
    lat: 12.9724,
    lng: 77.5951,
    description: "Admissions, Accounts, and Registrar offices",
    navigationHint: "The admin block faces the main boulevard near the central forecourt.",
  },
  {
    id: "demo-cs-dept",
    name: "Computer Science Department",
    type: "academic",
    lat: 12.972,
    lng: 77.5938,
    description: "Lecture Halls C1-C8 and AI Lab",
    navigationHint: "Head west from the central boulevard to reach the CS wing.",
  },
  {
    id: "demo-library",
    name: "Central Library",
    type: "academic",
    lat: 12.9712,
    lng: 77.5942,
    description: "Digital Library and Reading Rooms",
    navigationHint: "The library sits just south of the academic core along the quieter inner path.",
  },
  {
    id: "demo-hostel-a",
    name: "Hostel A",
    type: "hostel",
    lat: 12.9709,
    lng: 77.5954,
    description: "Boys hostel and common mess",
    navigationHint: "Follow the eastern residential road past the admin area to reach Hostel A.",
  },
  {
    id: "demo-hostel-b",
    name: "Hostel B",
    type: "hostel",
    lat: 12.9703,
    lng: 77.5937,
    description: "Girls hostel and recreation area",
    navigationHint: "Continue southwest along the hostel corridor to reach Hostel B.",
  },
  {
    id: "demo-bus-bay",
    name: "Main Bus Bay",
    type: "transport",
    lat: 12.9728,
    lng: 77.5947,
    description: "All city and campus shuttle departures",
    navigationHint: "The bus bay is just north of the main plaza along the outer access road.",
  },
];

export const DEFAULT_CAMPUS_PRESET_ID = "kbp-vashi";

export const CAMPUS_PRESETS: CampusPreset[] = [
  {
    id: "kbp-vashi",
    name: "Karmaveer Bhaurao Patil College, Vashi",
    center: {
      lat: 19.0768,
      lng: 72.9974,
    },
    zoom: 17,
    locations: KBP_VASHI_LOCATIONS,
  },
  {
    id: "demo-campus",
    name: "EDVIX Demo Campus",
    center: {
      lat: 12.9716,
      lng: 77.5946,
    },
    zoom: 16,
    locations: DEMO_CAMPUS_LOCATIONS,
  },
];

export const CAMPUS_CENTER =
  CAMPUS_PRESETS.find((preset) => preset.id === DEFAULT_CAMPUS_PRESET_ID)?.center ?? CAMPUS_PRESETS[0].center;

export const CAMPUS_LOCATIONS =
  CAMPUS_PRESETS.find((preset) => preset.id === DEFAULT_CAMPUS_PRESET_ID)?.locations ?? CAMPUS_PRESETS[0].locations;

export const ROLE_LABELS = {
  student: "Student",
  faculty: "Faculty",
  admin: "Admin",
  bus_driver: "Bus Driver",
} as const;
