import React from 'react';
export function InquiryPreferences({form,errors,update}) {
  return <div className="grid sm:grid-cols-2 gap-5">
    <label htmlFor="inquiry-floor">Floor preference (optional)<select id="inquiry-floor" name="floor" value={form.floor} onChange={update} aria-invalid={!!errors.floor} aria-describedby={errors.floor?'floor-error':undefined}>
      <option value="">Select...</option><option>Low floor</option><option>High floor</option><option>No preference</option>
    </select>{errors.floor&&<span className="error" id="floor-error">{errors.floor}</span>}</label>
    <label htmlFor="inquiry-budget">Budget (optional)<input id="inquiry-budget" name="budget" value={form.budget} onChange={update} maxLength={200} placeholder="e.g. PHP 6–8 million total" aria-invalid={!!errors.budget} aria-describedby="budget-help"/>
      <small id="budget-help">Include currency and total price or monthly payment.</small>{errors.budget&&<span className="error">{errors.budget}</span>}</label>
  </div>;
}
