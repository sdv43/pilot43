import { isRunActive } from "../../utils"
import { AgentSteps } from "../AgentSteps"
import { isStepActive } from "../AgentSteps/utils"
import { AssistantMessage } from "../AssistantMessage"
import { GeneratedFileCard } from "../GeneratedFileCard"
import { ToolApprovalCard } from "../ToolApprovalCard"
import { UserAnswerMessage } from "../UserAnswerMessage"
import { type RunContentProps } from "./types"
import { buildRunBlocks, getLiveStepsIndex } from "./utils"

/**
 * The assistant's side of a run: the steps folded into a timeline, then the
 * answer, files and anything waiting for the user.
 */
export function RunContent({ onOpenTool, run }: RunContentProps) {
  const blocks = buildRunBlocks(run)
  const isActive = isRunActive(run)
  const liveIndex = isActive ? getLiveStepsIndex(blocks) : -1

  return blocks.map((block, index) => {
    switch (block.kind) {
      case "answer":
        return <AssistantMessage key={block.id} message={block.message} />
      case "approval":
        return (
          <ToolApprovalCard
            key={block.id}
            messageRunId={run.id}
            tool={block.tool}
            onOpen={() => onOpenTool(block.tool)}
          />
        )
      case "files":
        return block.files.map((file) => (
          <GeneratedFileCard key={file.fileId} {...file} />
        ))
      case "steps": {
        const isLive = index === liveIndex
        // Between steps the model is thinking about what to do next; an
        // answer streaming below shows progress by itself.
        const isWorking =
          isLive &&
          run.status === "running" &&
          !block.steps.some((step) => isStepActive(step, isActive)) &&
          !blocks.slice(index + 1).some((next) => next.kind === "answer")

        return (
          <AgentSteps
            key={block.id}
            isLive={isLive}
            isRunActive={isActive}
            isWorking={isWorking}
            steps={block.steps}
            onOpenTool={onOpenTool}
          />
        )
      }
      case "user_answer":
        return <UserAnswerMessage key={block.id} message={block.message} />
    }
  })
}
