"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AnalyticsChartsProps = {
  attendanceByClass: { name: string; count: number }[];
  issueStatus: { name: string; value: number }[];
};

const issueColors = ["#f59e0b", "#10b981"];

export function AnalyticsCharts({ attendanceByClass, issueStatus }: AnalyticsChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Attendance by Class</CardTitle>
          <CardDescription>Top classes by attendance check-ins.</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendanceByClass}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Issue Resolution Split</CardTitle>
          <CardDescription>Pending versus resolved issue distribution.</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={issueStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                {issueStatus.map((entry, index) => (
                  <Cell key={entry.name} fill={issueColors[index % issueColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
