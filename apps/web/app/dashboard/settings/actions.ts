'use server';

// Legacy server actions — superseded by ProfileEditForm and DeleteAccountButton.
// Kept as stubs to avoid breaking legacy component imports; these are not called by any active route.

export async function updateCurrencyAction(_formData: FormData): Promise<{ success?: boolean; error?: string }> {
  return { error: 'Not implemented' };
}

export async function updateContingencyAction(_active: boolean): Promise<{ success?: boolean; error?: string }> {
  return { error: 'Not implemented' };
}
