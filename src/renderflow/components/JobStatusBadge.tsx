import { Badge } from "@/components/ui/badge";
import { RenderFlowJobState } from "../api";
import { JOB_STATE_LABELS, JOB_STATE_COLORS } from "../types";

export const JobStatusBadge = ({ state }: { state: RenderFlowJobState }) => {
    return (
        <Badge className={`${JOB_STATE_COLORS[state]} text-white border-0 shadow-sm`}>
            {JOB_STATE_LABELS[state]}
        </Badge>
    );
};
