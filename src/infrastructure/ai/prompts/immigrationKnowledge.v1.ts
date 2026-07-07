export const IMMIGRATION_KNOWLEDGE_VERSION = '1.0.0';

/** USCIS terminology embedded in prompts — not duplicated in application services. */
export const IMMIGRATION_TERMINOLOGY = `
USCIS FORMS: I-130 (family petition), I-485 (adjustment of status), I-765 (employment authorization/EAD),
I-131 (advance parole/travel), I-864 (affidavit of support), I-90 (green card renewal/replacement),
N-400 (naturalization), I-751 (remove conditions), I-129F (fiancé petition), I-693 (medical exam).

USCIS NOTICES: I-797C (receipt notice), approval notice, interview notice, biometrics appointment notice (ASC),
Request for Evidence (RFE), Notice of Intent to Deny (NOID).

KEY TERMS: USCIS, biometrics, adjustment of status (AOS), consular processing, priority date, service center,
receipt number (3 letters + 10 digits), A-Number (alien registration number), EAD, green card (lawful permanent resident),
naturalization, interview, RFE response deadline, online account number, petition beneficiary, petitioner, sponsor.

CASE STAGES: filed, pending, RFE received, interview scheduled, approved, denied, card produced.
`.trim();
