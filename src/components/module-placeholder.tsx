import { Hammer } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function ModulePlaceholder({
  title,
  description,
  nextStep,
}: {
  title: string;
  description: string;
  nextStep: string;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <Card className="mt-6 border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
            <Hammer className="h-5 w-5 text-accent-foreground" />
          </div>
          <p className="font-medium">Esta área está sendo preparada</p>
          <p className="max-w-md text-sm text-muted-foreground">{nextStep}</p>
        </CardContent>
      </Card>
    </div>
  );
}
