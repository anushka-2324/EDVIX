import { CampusMap } from "@/components/navigation/campus-map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CAMPUS_PRESETS } from "@/lib/constants";

export default function NavigationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Campus Navigation</h1>
        <p className="text-muted-foreground text-sm">
          Choose your college location, then generate walking directions to any mapped destination on campus.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interactive Campus Map</CardTitle>
          <CardDescription>Select a college preset, pick a route, and follow the generated directions.</CardDescription>
        </CardHeader>
        <CardContent>
          <CampusMap presets={CAMPUS_PRESETS} />
        </CardContent>
      </Card>
    </div>
  );
}
