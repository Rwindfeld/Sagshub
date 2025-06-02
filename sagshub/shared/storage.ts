interface IStorage {
  updateCase(
    id: number,
    caseData: Partial<Omit<Case, "id" | "createdAt" | "updatedAt">>
  ): Promise<Case | undefined>;
} 