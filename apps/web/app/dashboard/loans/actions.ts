'use server';

import { createClient } from '~/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Deletes a specific loan and all its associated data (cascade).
 * 
 * @param loanId - Unique identifier of the loan to delete.
 */
export async function deleteLoan(loanId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('loans')
    .delete()
    .eq('id', loanId)
    .eq('user_id', user.id);

  if (error) throw error;

  revalidatePath('/dashboard/loans');
  redirect('/dashboard/loans');
}

/**
 * Marks an entire loan as fully paid/completed.
 * 
 * @param loanId - Unique identifier of the loan.
 * @param completionDate - The date the loan was finished.
 */
export async function markLoanAsPaid(loanId: string, completionDate: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // Update loan status
  const { error: loanError } = await supabase
    .from('loans')
    .update({ status: 'completed' })
    .eq('id', loanId)
    .eq('user_id', user.id);

  if (loanError) throw loanError;

  // Ideally, we'd also mark all remaining payments as paid, 
  // but the current schema relies on entries in loan_payments to determine "paid" status.
  // We can leave individual payment toggling to the user or implement a batch update here.
  
  revalidatePath(`/dashboard/loans/${loanId}`);
  revalidatePath('/dashboard/loans');
}

/**
 * Toggles the payment status for a specific due date in the amortization schedule.
 * 
 * @param loanId - Unique identifier of the loan.
 * @param dueDate - The scheduled due date for the payment.
 * @param amount - The amount to be recorded as paid.
 * @param isPaid - Whether the payment is being marked as paid or pending.
 * @param paidDate - The actual date the payment was made.
 */
export async function togglePaymentStatus(
  loanId: string,
  dueDate: string,
  amount: number,
  isPaid: boolean,
  paidDate?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  if (isPaid) {
    // Ensure no duplicate exists for this due_date before inserting
    await supabase
      .from('loan_payments')
      .delete()
      .eq('loan_id', loanId)
      .eq('due_date', dueDate)
      .eq('user_id', user.id);

    // Insert payment record as 'paid'
    const { error } = await supabase
      .from('loan_payments')
      .insert({
        loan_id: loanId,
        user_id: user.id,
        due_date: dueDate,
        amount_paid: amount,
        paid_date: paidDate ?? new Date().toISOString().slice(0, 10),
        status: 'paid',
      });

    if (error) throw error;
  } else {
    // Remove payment record or set back to pending
    const { error } = await supabase
      .from('loan_payments')
      .delete()
      .eq('loan_id', loanId)
      .eq('due_date', dueDate)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  revalidatePath(`/dashboard/loans/${loanId}`);
  revalidatePath('/dashboard/loans');
}
