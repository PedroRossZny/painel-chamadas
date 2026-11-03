export interface SpokenCall {
  patientName: string;
  doctorName: string;
  sector: string;
}

/** Sentence read aloud on the panel. From the second attempt on, it also says the attempt number. */
export function buildSpeechText(call: SpokenCall, attempt: number): string {
  const sentence = `Paciente ${call.patientName}, dirigir-se ao ${call.sector} com ${call.doctorName}.`;

  return attempt > 1 ? `${sentence} Chamada número ${attempt}.` : sentence;
}
