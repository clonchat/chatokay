import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { generateMetadata as genMeta } from "@/lib/utils/metadata";

export const metadata: Metadata = genMeta({
  title: "Política de Privacidad - ChatOkay",
  description:
    "Política de privacidad de ChatOkay. Información sobre cómo recopilamos, usamos y protegemos tus datos personales. Cumplimiento con la Política de Datos de Usuario de Google API Services.",
  path: "/privacy",
  type: "article",
});

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              1. Information We Collect
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Personal Information
                </h3>
                <p className="text-muted-foreground">
                  We collect information you provide directly to us, such as
                  when you create an account, use our services, or contact us
                  for support. This may include your name, email address, phone
                  number, and any other information you choose to provide.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">Usage Information</h3>
                <p className="text-muted-foreground">
                  We automatically collect certain information about your use of
                  our services, including your IP address, browser type, device
                  information, and how you interact with our platform.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Cookies and Tracking
                </h3>
                <p className="text-muted-foreground">
                  We use cookies and similar tracking technologies to enhance
                  your experience and analyze usage patterns. You can control
                  cookie settings through your browser preferences.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              2. How We Use Your Information
            </h2>
            <div className="space-y-4">
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices, updates, and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze trends and usage</li>
                <li>Detect, prevent, and address technical issues</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              3. Information Sharing
            </h2>
            <p className="text-muted-foreground mb-4">
              We do not sell, trade, or otherwise transfer your personal
              information to third parties without your consent, except in the
              following circumstances:
            </p>
            <div className="space-y-4">
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and prevent fraud</li>
                <li>With service providers who assist in our operations</li>
                <li>In connection with a business transfer or acquisition</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p className="text-muted-foreground">
              We implement appropriate security measures to protect your
              personal information against unauthorized access, alteration,
              disclosure, or destruction. However, no method of transmission
              over the internet or electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
            <div className="space-y-4">
              <p className="text-muted-foreground">You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Access and update your personal information</li>
                <li>Request deletion of your personal information</li>
                <li>Opt out of certain communications</li>
                <li>Request data portability</li>
                <li>Withdraw consent where applicable</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              6. Third-Party Services and Google API Services
            </h2>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Our services integrate with third-party platforms including
                Google Calendar, Telegram, and WhatsApp. We are not responsible
                for the privacy practices of these third parties. We encourage
                you to review their privacy policies.
              </p>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-lg font-medium mb-2">
                  Google Calendar API Usage
                </h3>
                <p className="text-muted-foreground text-sm mb-3">
                  When you connect your Google Calendar account to ChatOkay, we
                  access the following data:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm mb-3">
                  <li>Calendar events and availability</li>
                  <li>Calendar metadata (names, descriptions, locations)</li>
                  <li>Calendar settings (time zones, working hours)</li>
                </ul>
                <p className="text-muted-foreground text-sm mb-2">
                  <strong>Limited Use of Google User Data:</strong> Our use of
                  information received from Google APIs adheres to the{" "}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    className="text-primary underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google API Services User Data Policy
                  </a>
                  , including the Limited Use requirements. Specifically:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                  <li>
                    We only use this data to provide appointment scheduling
                    services
                  </li>
                  <li>
                    We do not transfer your calendar data to third parties
                    except as necessary to provide our service
                  </li>
                  <li>
                    We do not use your calendar data for advertising or other
                    commercial purposes
                  </li>
                  <li>
                    We do not allow humans to read your calendar data unless you
                    request support and authorize access
                  </li>
                </ul>
                <p className="text-muted-foreground text-sm mt-3">
                  You can revoke access to your Google Calendar data at any time
                  through your Google account settings or by disconnecting the
                  integration in your ChatOkay dashboard.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              7. Children's Privacy
            </h2>
            <p className="text-muted-foreground">
              Our services are not intended for children under 13 years of age.
              We do not knowingly collect personal information from children
              under 13.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              8. Changes to This Policy
            </h2>
            <p className="text-muted-foreground">
              We may update this privacy policy from time to time. We will
              notify you of any changes by posting the new policy on this page
              and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this privacy policy, please
              contact us at:
            </p>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="font-medium">Email: chatokay.dev@gmail.com</p>
              <p className="text-sm text-muted-foreground mt-1">
                Para consultas sobre privacidad o el manejo de datos de Google
                Calendar
              </p>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
