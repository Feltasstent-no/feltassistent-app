const VALID_INPUT_CLASS =
  'w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent';
const INVALID_INPUT_CLASS =
  'w-full px-4 py-3 bg-red-50 border border-red-400 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent';

export function requiredInputClass(invalid: boolean): string {
  return invalid ? INVALID_INPUT_CLASS : VALID_INPUT_CLASS;
}

export function RequiredFieldError({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  return <p className="text-xs text-red-600 font-medium mt-1">{message}</p>;
}
