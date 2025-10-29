interface JsonLdProps {
  data: object;
}

/**
 * Componente para agregar datos estructurados JSON-LD a la página
 * Usa un script inline en el head para mejor SEO
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
