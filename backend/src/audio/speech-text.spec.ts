import { buildSpeechText } from './speech-text';

const call = {
  patientName: 'ANA SOUZA',
  doctorName: 'Dr. Carlos Lima',
  sector: 'Consultório 1',
};

describe('buildSpeechText', () => {
  it('reads the first call without an attempt number', () => {
    expect(buildSpeechText(call, 1)).toBe(
      'Paciente ANA SOUZA, dirigir-se ao Consultório 1 com Dr. Carlos Lima.',
    );
  });

  it('adds the attempt number when the patient is called again', () => {
    expect(buildSpeechText(call, 3)).toBe(
      'Paciente ANA SOUZA, dirigir-se ao Consultório 1 com Dr. Carlos Lima. Chamada número 3.',
    );
  });
});
