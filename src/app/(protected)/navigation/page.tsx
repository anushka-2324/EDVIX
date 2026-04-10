import { CampusMap } from "@/components/navigation/campus-map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CAMPUS_LOCATIONS } from "@/lib/constants";

export default function NavigationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Campus Navigation</h1>
        <p className="text-muted-foreground text-sm">
          Search buildings and locate departments, hostels, and transport bays.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interactive Campus Map</CardTitle>
          <CardDescription>Static MVP map with searchable location markers.</CardDescription>
        </CardHeader>
        <CardContent>
          <CampusMap locations={CAMPUS_LOCATIONS} />
        </CardContent>
      </Card>
    </div>
  );
}
