const express = require('express');
const Joi = require('joi');
const fetch = require('node-fetch');
const { authenticateToken, requireRole, ROLES } = require('../middleware/auth');

const router = express.Router();

const assistantSchema = Joi.object({
  intent: Joi.string().valid('chat', 'evolution', 'prescription', 'custom_form_fill', 'clinical_history', 'full_fill').required(),
  prompt: Joi.string().allow('', null).default(''),
  patientId: Joi.number().integer().positive().optional().allow(null),
  appointmentId: Joi.number().integer().positive().optional().allow(null),
  context: Joi.object().default({})
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_ORG_ID = process.env.OPENAI_ORG_ID || '';
const OPENAI_PROJECT_ID = process.env.OPENAI_PROJECT_ID || '';

const buildSystemPrompt = (intent) => {
  const base = [
    'Eres un asistente clínico que ayuda a médicos en español.',
    'Sigue buenas prácticas clínicas y no inventes datos.',
    'Nunca incluyas datos personales de otros pacientes y mantén confidencialidad.',
    'Devuelve SIEMPRE la salida en formato JSON estrictamente, sin texto adicional.',
  ];

  if (intent === 'chat') {
    base.push('Para intent "chat" devuelve: { "message": string_html }');
  } else if (intent === 'evolution') {
    base.push('Para intent "evolution" devuelve: { "suggestedEvolutionHtml": string_html }');
  } else if (intent === 'prescription') {
    base.push('Para intent "prescription" devuelve: { "suggestedPrescriptionHtml": string_html }');
  } else if (intent === 'custom_form_fill') {
    base.push('Para intent "custom_form_fill" devuelve: { "fields": object } con pares nombreCampo->valor plausibles.');
  } else if (intent === 'clinical_history') {
    base.push('Para intent "clinical_history" devuelve: { "suggestedHistoryHtml": string_html }');
  } else if (intent === 'full_fill') {
    base.push('Para intent "full_fill" devuelve un objeto JSON con posibles claves:');
    base.push('{ "suggestedHistoryHtml"?: string_html, "suggestedEvolutionHtml"?: string_html, "suggestedPrescriptionHtml"?: string_html, "fields"?: object }');
    base.push('Usa el contexto para proponer contenidos consistentes, y solo devuelve JSON.');
  }

  base.push('El HTML devuelto debe ser limpio, semántico, sin estilos inline complejos.');
  return base.join('\n');
};

router.post('/assistant', authenticateToken, requireRole([ROLES.SUPER_USER, ROLES.MEDICAL_USER]), async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY no configurada' });
  }

  const { error, value } = assistantSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: 'Datos inválidos', details: error.details.map(d => d.message) });
  }

  const { intent, prompt, context } = value;

  try {
    const system = buildSystemPrompt(intent);
    const userPayload = {
      intent,
      prompt: String(prompt || ''),
      context
    };

    const body = {
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(userPayload) }
      ],
      temperature: 0.3,
      max_tokens: 700,
      response_format: { type: 'json_object' }
    };

    const headers = {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    };
    if (OPENAI_ORG_ID) headers['OpenAI-Organization'] = OPENAI_ORG_ID;
    if (OPENAI_PROJECT_ID) headers['OpenAI-Project'] = OPENAI_PROJECT_ID;

    const resp = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      let bodyText = '';
      try { bodyText = await resp.text(); } catch (_) {}
      let parsedErr = {};
      try { parsedErr = JSON.parse(bodyText); } catch (_) {}
      const status = (resp.status === 401 ? 502 : resp.status) || 502;
      const message = parsedErr.error?.message || parsedErr.message || 'Error al invocar OpenAI';
      return res.status(status).json({ error: message, details: bodyText });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || '';

    let parsed;
    try { parsed = JSON.parse(content); } catch (_) { parsed = { message: content }; }

    return res.json(parsed);
  } catch (err) {
    console.error('AI assistant error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;


