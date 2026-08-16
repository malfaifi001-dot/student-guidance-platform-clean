type TeachixStructuredDataProps = {
  includeOrganization?: boolean;
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "تيتش اكس",
  alternateName: "Teachix",
  url: "https://teachix.sa/",
  inLanguage: "ar-SA",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "تيتش اكس",
  alternateName: "Teachix",
  url: "https://teachix.sa/",
  logo: "https://teachix.sa/brand/teachix-icon.svg",
};

export function TeachixStructuredData({
  includeOrganization = true,
}: TeachixStructuredDataProps) {
  const graph = includeOrganization
    ? [websiteSchema, organizationSchema]
    : [websiteSchema];

  return (
    <script
      id="teachix-public-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }) }}
    />
  );
}
