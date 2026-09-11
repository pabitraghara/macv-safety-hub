import { InlineTextEditor } from "@/components/shared/InlineTextEditor";
import { Activities } from "@/components/shared/activities/Activities";
import { Attachments } from "@/components/shared/attachments/Attachments";
import { useIncidentActivities, useAddIncidentComment, useIncidentAttachments } from "@/api/incidents";
import type { Incident } from "@/api/incidents/types";

interface IncidentMainContentProps {
  currentTitle: string;
  currentDescription: string;
  onTitleSave: (newTitle: string) => Promise<void>;
  onDescriptionSave: (newDescription: string) => Promise<void>;
  incidentCode: string;
  activitiesRefreshTrigger: number;
  incident: Incident;
}

export function IncidentMainContent({
  currentTitle,
  currentDescription,
  onTitleSave,
  onDescriptionSave,
  incidentCode,
  activitiesRefreshTrigger,
  incident,
}: IncidentMainContentProps) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-3 mb-3 mt-6">
        <InlineTextEditor
          value={currentTitle}
          onSave={onTitleSave}
          placeholder="Click to add a title..."
          className="flex-1"
          inputClassName="text-2xl sm:text-3xl font-bold"
        />
      </div>

      <div className="mb-6">
        <InlineTextEditor
          value={currentDescription}
          onSave={onDescriptionSave}
          placeholder="Click to add a description..."
          isTextarea={true}
          minHeight="60px"
        />
      </div>

      <div>
        <Attachments code={incidentCode} useAttachmentsHook={useIncidentAttachments} />
      </div>

      <div>
        <Activities
          code={incidentCode}
          useActivitiesHook={useIncidentActivities}
          useAddCommentHook={useAddIncidentComment}
          refreshTrigger={activitiesRefreshTrigger}
        />
      </div>
    </div>
  );
}
