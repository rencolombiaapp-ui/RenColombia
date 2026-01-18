/**
 * Constantes de marca y plataforma
 * 
 * Este archivo centraliza todas las referencias a la marca para facilitar
 * futuros cambios de branding sin modificar código en múltiples lugares.
 */

export const BRAND_NAME = "RentarColombia";
export const PLATFORM_NAME = "RentarColombia";
export const BRAND_DOMAIN = "rentarcolombia.com";
export const BRAND_EMAIL_SUPPORT = `support@${BRAND_DOMAIN}`;
export const BRAND_EMAIL_INFO = `info@${BRAND_DOMAIN}`;

// Descripción corta de la plataforma
export const PLATFORM_DESCRIPTION = "La plataforma digital para arrendar, contratar y pagar inmuebles en Colombia";

// Descripción extendida
export const PLATFORM_DESCRIPTION_EXTENDED = "Publica, encuentra y gestiona arriendos con contratos digitales, verificación y mayor seguridad.";

// Disclaimer legal estándar
export const LEGAL_DISCLAIMER = `${BRAND_NAME} proporciona plantillas digitales de contratos de arrendamiento y herramientas de gestión. No sustituye asesoría legal profesional.`;

// Disclaimer completo para contratos
export const CONTRACT_DISCLAIMER = `Este contrato es una plantilla generada automáticamente por ${BRAND_NAME} y no sustituye asesoría legal profesional. Recomendamos consultar con un abogado antes de continuar.`;

// Texto de copyright
export const COPYRIGHT_TEXT = (year: number = new Date().getFullYear()) => 
  `${BRAND_NAME} © ${year} – Plataforma digital de arrendamientos en Colombia`;

// User-Agent para APIs externas
export const API_USER_AGENT = `${BRAND_NAME}/1.0`;

// Atribución de datos
export const DATA_SOURCE_ATTRIBUTION = `Fuente: Datos del mercado ${BRAND_NAME}`;
export const DATA_SOURCE_BADGE = `Datos ${BRAND_NAME}`;
export const DATA_SOURCE_TOOLTIP = `Análisis calculado con datos reales de propiedades publicadas en ${BRAND_NAME}`;
