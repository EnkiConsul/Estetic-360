import { Skeleton } from "@/components/ui/skeleton";
import { useLeadActivities, type MemberOption } from "@/hooks/use-crm";
import {
  ACTIVITY_KIND_LABELS,
  formatDateTime,
  LEAD_STATUS_LABELS,
  type LeadActivity,
} from "@/lib/crm-data";

export function LeadActivityTimeline({
  leadId,
  members,
}: {
  leadId: string;
  members: MemberOption[];
}) {
  const { data, isPending, error } = useLeadActivities(leadId);

  if (isPending) return <Skeleton className="h-24 w-full" />;
  if (error) {
    return <p className="text-sm text-muted-foreground">Não conseguimos carregar o histórico.</p>;
  }
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>;
  }

  return (
    <ol className="space-y-3">
      {data.map((activity) => (
        <li key={activity.id} className="border-l-2 border-border pl-3">
          <p className="text-sm font-medium">{ACTIVITY_KIND_LABELS[activity.kind]}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(activity.happened_at)} · {authorName(activity, members)}
          </p>
          {statusLine(activity) && (
            <p className="mt-1 text-xs text-muted-foreground">{statusLine(activity)}</p>
          )}
          {activity.note && <p className="mt-1 text-sm">{activity.note}</p>}
        </li>
      ))}
    </ol>
  );
}

function authorName(activity: LeadActivity, members: MemberOption[]) {
  if (!activity.created_by_member_id) return "Sistema";
  return members.find((m) => m.id === activity.created_by_member_id)?.name ?? "Usuário da clínica";
}

function statusLine(activity: LeadActivity) {
  if (!activity.new_status || activity.kind === "criacao") return null;
  const from = activity.previous_status ? LEAD_STATUS_LABELS[activity.previous_status] : null;
  const to = LEAD_STATUS_LABELS[activity.new_status];
  return from ? `${from} → ${to}` : to;
}
