export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function formatDateOnly(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", { dateStyle: "medium" });
}

export const planTypeLabel: Record<string, string> = {
  diario: "Diário",
  mensal: "Mensal",
  anual: "Anual",
};

export const orderStatusLabel: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  failed: "Falhou",
  refunded: "Reembolsado",
  canceled: "Cancelado",
};

export const licenseStatusLabel: Record<string, string> = {
  active: "Ativa",
  inactive: "Inativa",
  expired: "Expirada",
  blocked: "Bloqueada",
};
