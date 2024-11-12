import { Models } from "node-appwrite";

export interface Patient extends Models.Document {
  userId: string;
  name: string;
  email: string;
  phone: string;

  identificationType: string | undefined;
  identificationNumber: string | undefined;
  identificationDocument: FormData | undefined;
  privacyConsent: boolean;
  treatmentConsent: boolean;
  disclosureConsent: boolean;

}

export interface Appointment extends Models.Document {
  patient: Patient;
  schedule: Date;
  status: Status;
  primaryPhysician: string;
  age: number;
  gender: Gender;
  neighbourhood: string;
  scholarship: string;
  hypertension: string;
  diabetes: string;
  alcoholism: string;
  handicap: string;
  smsRecieved: string;
  reason: string;
  note: string;
  userId: string;
  cancellationReason: string | null;
}
