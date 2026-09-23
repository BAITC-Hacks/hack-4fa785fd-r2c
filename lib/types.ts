import { z } from "zod";

/** Shared contract from AGENTS.md. Coordinate changes between both developers. */
export const fieldKeys = [
  "title",
  "context",
  "need",
  "users",
  "data",
  "constraints",
  "expectedResult",
  "successCriteria",
  "contact",
  "interactionFormat",
] as const;

export const FieldKeySchema = z.enum(fieldKeys);
export type FieldKey = z.infer<typeof FieldKeySchema>;

const fieldShape = <Schema extends z.ZodType>(schema: Schema) => ({
  title: schema,
  context: schema,
  need: schema,
  users: schema,
  data: schema,
  constraints: schema,
  expectedResult: schema,
  successCriteria: schema,
  contact: schema,
  interactionFormat: schema,
});

export const IdSchema = z.string().trim().min(1, "Не указан идентификатор.");
export const IsoDateTimeSchema = z.iso.datetime({ offset: true });
export const HttpUrlSchema = z.url({
  protocol: /^https?$/,
  error: "Укажите корректную ссылку, начинающуюся с http:// или https://.",
});

export const CardFieldSourceSchema = z.enum([
  "ai_extracted",
  "user_edited",
  "user_answer",
]);
export type CardFieldSource = z.infer<typeof CardFieldSourceSchema>;

export const CardFieldSchema = z.strictObject({
  value: z.string(),
  confirmed: z.boolean(),
  source: CardFieldSourceSchema,
  evidence: z.string().optional(),
});
export type CardField = z.infer<typeof CardFieldSchema>;

export const CardSchema = z.strictObject(fieldShape(CardFieldSchema));
export type Card = z.infer<typeof CardSchema>;

export const BlockKeySchema = z.enum([
  "contextNeed",
  "data",
  "expectedResult",
  "successCriteria",
  "constraints",
  "users",
  "businessLink",
]);
export type BlockKey = z.infer<typeof BlockKeySchema>;

export const LevelSchema = z.enum(["draft", "workable", "ready", "priority"]);
export type Level = z.infer<typeof LevelSchema>;

const ScorePointsSchema = z.number().int().min(0).max(100);

export const ScoreCheckSchema = z.strictObject({
  id: IdSchema,
  label: z.string(),
  points: ScorePointsSchema,
  passed: z.boolean(),
  hint: z.string(),
});
export type ScoreCheck = z.infer<typeof ScoreCheckSchema>;

export const ScoreBlockSchema = z.strictObject({
  key: BlockKeySchema,
  label: z.string(),
  max: ScorePointsSchema,
  earned: ScorePointsSchema,
  checks: z.array(ScoreCheckSchema),
});
export type ScoreBlock = z.infer<typeof ScoreBlockSchema>;

export const ScoreMissingSchema = z.strictObject({
  label: z.string(),
  points: ScorePointsSchema,
  hint: z.string(),
});
export type ScoreMissing = z.infer<typeof ScoreMissingSchema>;

export const ScoreResultSchema = z.strictObject({
  total: ScorePointsSchema,
  potential: ScorePointsSchema,
  level: LevelSchema,
  blocks: z.array(ScoreBlockSchema),
  missing: z.array(ScoreMissingSchema),
});
export type ScoreResult = z.infer<typeof ScoreResultSchema>;

export const ScoreHistoryEntrySchema = z.strictObject({
  at: IsoDateTimeSchema,
  total: ScorePointsSchema,
});
export type ScoreHistoryEntry = z.infer<typeof ScoreHistoryEntrySchema>;

export const TaskStatusSchema = z.enum(["draft", "published"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.strictObject({
  id: IdSchema,
  businessName: z.string(),
  industry: z.string(),
  draftText: z.string(),
  card: CardSchema,
  status: TaskStatusSchema,
  score: ScoreResultSchema,
  tags: z.array(z.string()),
  scoreHistory: z.array(ScoreHistoryEntrySchema),
  createdAt: IsoDateTimeSchema,
  publishedAt: IsoDateTimeSchema.optional(),
});
export type Task = z.infer<typeof TaskSchema>;

export const TeamSchema = z.strictObject({
  id: IdSchema,
  name: z.string(),
  interests: z.array(z.string()),
  skills: z.array(z.string()),
  technologies: z.array(z.string()),
  points: z.number().int().nonnegative(),
});
export type Team = z.infer<typeof TeamSchema>;

export const ProposalStatusSchema = z.enum(["pending", "accepted", "rejected"]);
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;

export const ProposalSchema = z.strictObject({
  id: IdSchema,
  taskId: IdSchema,
  teamId: IdSchema,
  idea: z.string(),
  plan: z.string(),
  timeline: z.string(),
  prototypeUrl: HttpUrlSchema,
  status: ProposalStatusSchema,
  milestoneConfirmed: z.boolean(),
  createdAt: IsoDateTimeSchema,
});
export type Proposal = z.infer<typeof ProposalSchema>;

export const ProposalWithTeamSchema = ProposalSchema.extend({ team: TeamSchema });
export type ProposalWithTeam = z.infer<typeof ProposalWithTeamSchema>;

export const AiProviderSchema = z.enum(["openai", "nvidia", "local"]);
export type AiProvider = z.infer<typeof AiProviderSchema>;

export const AiDebugSchema = z.strictObject({
  id: IdSchema,
  at: IsoDateTimeSchema,
  provider: AiProviderSchema,
  prompt: z.string(),
  input: z.unknown(),
  rawOutput: z.string(),
  validation: z.strictObject({
    success: z.boolean(),
    errors: z.array(z.string()),
  }),
  rejectedFields: z.array(FieldKeySchema),
});
export type AiDebug = z.infer<typeof AiDebugSchema>;

export const DatabaseSchema = z.strictObject({
  tasks: z.array(TaskSchema),
  teams: z.array(TeamSchema),
  proposals: z.array(ProposalSchema),
  aiLogs: z.array(AiDebugSchema),
});
export type Database = z.infer<typeof DatabaseSchema>;

/** This cookie selects a demo role; it is not an authorization credential. */
export const RoleSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("business"),
    businessName: z.string().trim().min(1, "Укажите компанию."),
  }),
  z.strictObject({ kind: z.literal("team"), teamId: IdSchema }),
]);
export type Role = z.infer<typeof RoleSchema>;

export const ExtractedFieldSchema = z.strictObject({
  value: z.string(),
  evidence: z.string(),
});
export type ExtractedField = z.infer<typeof ExtractedFieldSchema>;

export const ClarificationQuestionSchema = z.strictObject({
  id: z.string().min(1),
  field: FieldKeySchema,
  question: z.string().min(1),
  why: z.string().min(1),
});
export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;

export const AnswerSchema = z.strictObject({
  questionId: IdSchema,
  field: FieldKeySchema,
  answer: z.string().trim().min(1, "Введите ответ на вопрос."),
});
export type Answer = z.infer<typeof AnswerSchema>;

export const AnalyzeDraftInputSchema = z.strictObject({
  draftText: z.string().trim().min(1, "Опишите задачу."),
  industry: z.string().trim().min(1, "Укажите отрасль."),
});
export type AnalyzeDraftInput = z.infer<typeof AnalyzeDraftInputSchema>;

const questionsSchema = z.array(ClarificationQuestionSchema).min(3).max(6);

/** Public function contract: absent information is omitted from extracted. */
export const AnalyzeDraftResultSchema = z.strictObject({
  extracted: z.strictObject(fieldShape(ExtractedFieldSchema.optional())),
  missing: z.array(FieldKeySchema),
  questions: questionsSchema,
});
export type AnalyzeDraftResult = z.infer<typeof AnalyzeDraftResultSchema>;

/** Strict structured outputs require every key; absent information is null. */
export const AnalyzeDraftStructuredResultSchema = z.strictObject({
  extracted: z.strictObject(fieldShape(ExtractedFieldSchema.nullable())),
  missing: z.array(FieldKeySchema),
  questions: questionsSchema,
});
export type AnalyzeDraftStructuredResult = z.infer<
  typeof AnalyzeDraftStructuredResultSchema
>;

export const AnalyzeDraftResponseSchema = AnalyzeDraftResultSchema.extend({
  debug: AiDebugSchema,
});
export type AnalyzeDraftResponse = z.infer<typeof AnalyzeDraftResponseSchema>;

export const BuildCardInputSchema = z.strictObject({
  draftText: z.string().trim().min(1, "Опишите задачу."),
  answers: z.array(AnswerSchema),
});
export type BuildCardInput = z.infer<typeof BuildCardInputSchema>;

export const BuildCardResultSchema = z.strictObject(
  fieldShape(ExtractedFieldSchema.nullable()),
);
export type BuildCardResult = z.infer<typeof BuildCardResultSchema>;

export const BuildCardResponseSchema = z.strictObject({
  card: BuildCardResultSchema,
  debug: AiDebugSchema,
});
export type BuildCardResponse = z.infer<typeof BuildCardResponseSchema>;

/** SDK-independent schemas for OpenAI-compatible structured output requests. */
export const analyzeDraftJsonSchema = z.toJSONSchema(
  AnalyzeDraftStructuredResultSchema,
  { target: "draft-7" },
);
export const buildCardJsonSchema = z.toJSONSchema(BuildCardResultSchema, {
  target: "draft-7",
});

export const CreateTaskInputSchema = z.strictObject({
  businessName: z.string().trim().min(1, "Укажите компанию."),
  industry: z.string().trim().min(1, "Укажите отрасль."),
  draftText: z.string().trim().min(1, "Опишите задачу."),
  card: CardSchema,
});
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

export const UpdateTaskInputSchema = z.strictObject({ card: CardSchema });
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;

export const CreateProposalInputSchema = z.strictObject({
  teamId: IdSchema,
  idea: z.string().trim().min(1, "Опишите идею решения."),
  plan: z.string().trim().min(1, "Опишите план работы."),
  timeline: z.string().trim().min(1, "Укажите срок."),
  prototypeUrl: HttpUrlSchema,
});
export type CreateProposalInput = z.infer<typeof CreateProposalInputSchema>;

export const ProposalActionInputSchema = z.strictObject({
  action: z.enum(["accept", "reject", "confirmMilestone"]),
});
export type ProposalActionInput = z.infer<typeof ProposalActionInputSchema>;

const emptyQueryValueToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const CatalogQuerySchema = z.strictObject({
  industry: z.preprocess(
    emptyQueryValueToUndefined,
    z.string().trim().min(1).optional(),
  ),
  level: z.preprocess(emptyQueryValueToUndefined, LevelSchema.optional()),
  teamId: z.preprocess(emptyQueryValueToUndefined, IdSchema.optional()),
});
export type CatalogQuery = z.infer<typeof CatalogQuerySchema>;

export const TaskRecommendationSchema = z.strictObject({
  task: TaskSchema,
  reason: z.string(),
  matches: z.array(z.string()),
});
export type TaskRecommendation = z.infer<typeof TaskRecommendationSchema>;

export const CatalogResponseSchema = z.strictObject({
  tasks: z.array(TaskSchema),
  recommended: z.array(TaskRecommendationSchema),
});
export type CatalogResponse = z.infer<typeof CatalogResponseSchema>;

export const ApiErrorResponseSchema = z.strictObject({ error: z.string() });
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export const TaskIdParamsSchema = z.strictObject({ id: IdSchema });
export const ProposalIdParamsSchema = z.strictObject({ id: IdSchema });
export const TeamsResponseSchema = z.array(TeamSchema);
export const TaskProposalsResponseSchema = z.array(ProposalWithTeamSchema);
export type TeamsResponse = z.infer<typeof TeamsResponseSchema>;
export type TaskProposalsResponse = z.infer<typeof TaskProposalsResponseSchema>;
