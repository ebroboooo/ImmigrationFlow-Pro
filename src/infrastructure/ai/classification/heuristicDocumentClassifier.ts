import type { ClassificationResult, ImmigrationDocumentType } from '../../../domain/ai/DocumentClassification';
import type { IDocumentClassifier } from '../../../domain/ai/services';

interface ClassificationRule {
  type: ImmigrationDocumentType;
  keywords: string[];
  fileNameHints: string[];
  weight: number;
}

const RULES: ClassificationRule[] = [
  { type: 'USCIS Receipt Notice (I-797C)', keywords: ['i-797c', 'receipt notice', 'case was received', 'we received your', 'notice of action'], fileNameHints: ['797', 'receipt', 'notice-of-action'], weight: 1 },
  { type: 'USCIS Approval Notice', keywords: ['approval notice', 'petition approved', 'application approved', 'has been approved'], fileNameHints: ['approval', 'approved'], weight: 1 },
  { type: 'USCIS Interview Notice', keywords: ['interview notice', 'scheduled interview', 'appearance required', 'you are scheduled for an interview'], fileNameHints: ['interview'], weight: 1 },
  { type: 'USCIS Biometrics Appointment', keywords: ['biometric', 'biometrics appointment', 'asc appointment', 'application support center'], fileNameHints: ['biometric', 'biometrics', 'asc'], weight: 1 },
  { type: 'Request For Evidence (RFE)', keywords: ['request for evidence', 'rfe', 'additional evidence', 'submit the following evidence'], fileNameHints: ['rfe'], weight: 1 },
  { type: 'Notice of Intent to Deny (NOID)', keywords: ['notice of intent to deny', 'noid', 'intent to deny'], fileNameHints: ['noid', 'deny'], weight: 1 },
  { type: 'Passport', keywords: ['passport', 'travel document', 'nationality', 'passport no'], fileNameHints: ['passport'], weight: 0.9 },
  { type: 'Visa', keywords: ['visa', 'nonimmigrant', 'immigrant visa', 'visa class'], fileNameHints: ['visa'], weight: 0.85 },
  { type: 'Green Card', keywords: ['green card', 'permanent resident', 'lawful permanent resident', 'i-551'], fileNameHints: ['green-card', 'greencard', 'i551'], weight: 0.9 },
  { type: 'Employment Authorization Card', keywords: ['employment authorization', 'ead', 'i-766', 'work authorization'], fileNameHints: ['ead', '765'], weight: 0.95 },
  { type: 'Naturalization Certificate', keywords: ['naturalization certificate', 'certificate of naturalization', 'n-550', 'n-570'], fileNameHints: ['naturalization'], weight: 0.9 },
  { type: 'Birth Certificate', keywords: ['birth certificate', 'certificate of birth', 'certificate of live birth'], fileNameHints: ['birth'], weight: 0.9 },
  { type: 'Marriage Certificate', keywords: ['marriage certificate', 'certificate of marriage'], fileNameHints: ['marriage'], weight: 0.9 },
  { type: 'Divorce Certificate', keywords: ['divorce decree', 'dissolution of marriage', 'divorce certificate'], fileNameHints: ['divorce'], weight: 0.9 },
  { type: 'Driver License', keywords: ["driver's license", 'driver license', 'dmv', 'class c'], fileNameHints: ['license', 'dl'], weight: 0.85 },
  { type: 'State ID', keywords: ['state identification', 'state id card', 'identification card'], fileNameHints: ['state-id', 'id-card'], weight: 0.85 },
  { type: 'Social Security Card', keywords: ['social security', 'social security administration', 'ssn'], fileNameHints: ['ssn', 'social-security'], weight: 0.9 },
  { type: 'Police Clearance', keywords: ['police clearance', 'certificate of good conduct', 'criminal record check'], fileNameHints: ['police', 'clearance'], weight: 0.85 },
  { type: 'Court Records', keywords: ['court record', 'disposition', 'superior court', 'district court'], fileNameHints: ['court'], weight: 0.85 },
  { type: 'Medical Examination', keywords: ['i-693', 'medical examination', 'civil surgeon', 'vaccination record'], fileNameHints: ['medical', 'i693'], weight: 0.9 },
  { type: 'Tax Documents', keywords: ['form 1040', 'tax return', 'w-2', 'w2', 'irs', 'tax year'], fileNameHints: ['tax', '1040', 'w2'], weight: 0.85 },
  { type: 'Financial Documents', keywords: ['bank statement', 'pay stub', 'financial statement', 'account balance'], fileNameHints: ['bank', 'financial', 'paystub'], weight: 0.85 },
  { type: 'Employment Documents', keywords: ['employment letter', 'offer letter', 'job offer', 'employer letter'], fileNameHints: ['employment', 'offer-letter'], weight: 0.85 },
  { type: 'I-130', keywords: ['i-130', 'petition for alien relative'], fileNameHints: ['130'], weight: 1 },
  { type: 'I-485', keywords: ['i-485', 'adjustment of status'], fileNameHints: ['485', 'aos'], weight: 1 },
  { type: 'I-765', keywords: ['i-765'], fileNameHints: ['765'], weight: 0.9 },
  { type: 'I-864', keywords: ['i-864', 'affidavit of support'], fileNameHints: ['864'], weight: 0.9 },
];

export class HeuristicDocumentClassifier implements IDocumentClassifier {
  classify(text: string, fileName: string): ClassificationResult {
    const haystack = `${fileName} ${text}`.toLowerCase();
    let best: ClassificationResult = {
      documentType: 'Unknown',
      confidence: 0.1,
      source: 'heuristic',
      reason: 'No classification signals matched.',
      matchedSignals: [],
    };

    for (const rule of RULES) {
      const signals: string[] = [];
      let score = 0;
      for (const kw of rule.keywords) {
        if (haystack.includes(kw)) {
          signals.push(kw);
          score += rule.weight;
        }
      }
      for (const hint of rule.fileNameHints) {
        if (fileName.toLowerCase().includes(hint)) {
          signals.push(`filename:${hint}`);
          score += rule.weight * 0.5;
        }
      }
      const confidence = Math.min(0.95, score / 3);
      if (confidence > best.confidence) {
        best = {
          documentType: rule.type,
          confidence: Math.round(confidence * 100) / 100,
          source: 'heuristic',
          reason: signals.length
            ? `Matched signals: ${signals.slice(0, 5).join(', ')}${signals.length > 5 ? '…' : ''}`
            : 'Weak heuristic match.',
          matchedSignals: signals,
        };
      }
    }

    return best;
  }
}

export const heuristicDocumentClassifier = new HeuristicDocumentClassifier();
