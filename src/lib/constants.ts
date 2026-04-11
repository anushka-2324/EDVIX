import { type CampusLocation } from "@/lib/types";

export const APP_NAME = "EDVIX – Smart Campus Ecosystem";

export const CAMPUS_CENTER = {
  lat: 12.9716,
  lng: 77.5946,
};

export const CAMPUS_LOCATIONS: CampusLocation[] = [
  {
    id: "admin-block",
    name: "Admin Block",
    type: "admin",
    lat: 12.9724,
    lng: 77.5951,
    description: "Admissions, Accounts, and Registrar offices",
  },
  {
    id: "cs-dept",
    name: "Computer Science Department",
    type: "academic",
    lat: 12.972,
    lng: 77.5938,
    description: "Lecture Halls C1-C8 and AI Lab",
  },
  {
    id: "library",
    name: "Central Library",
    type: "academic",
    lat: 12.9712,
    lng: 77.5942,
    description: "Digital Library and Reading Rooms",
  },
  {
    id: "hostel-a",
    name: "Hostel A",
    type: "hostel",
    lat: 12.9709,
    lng: 77.5954,
    description: "Boys hostel and common mess",
  },
  {
    id: "hostel-b",
    name: "Hostel B",
    type: "hostel",
    lat: 12.9703,
    lng: 77.5937,
    description: "Girls hostel and recreation area",
  },
  {
    id: "bus-bay",
    name: "Main Bus Bay",
    type: "transport",
    lat: 12.9728,
    lng: 77.5947,
    description: "All city and campus shuttle departures",
  },
];

export const ROLE_LABELS = {
  student: "Student",
  faculty: "Faculty",
  admin: "Admin",
  bus_driver: "Bus Driver",
} as const;
