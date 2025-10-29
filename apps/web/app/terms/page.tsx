import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { generateMetadata as genMeta } from "@/lib/utils/metadata";

export const metadata: Metadata = genMeta({
  title: "Términos de Servicio - ChatOkay",
  description:
    "Términos de servicio de ChatOkay. Información sobre el uso de nuestra plataforma, integraciones con Google Calendar, Telegram y WhatsApp, y políticas de uso aceptable.",
  path: "/terms",
  type: "article",
});

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Terms of Service</CardTitle>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-muted-foreground">
              By accessing and using ChatOkay ("the Service"), you accept and
              agree to be bound by the terms and provision of this agreement. If
              you do not agree to abide by the above, please do not use this
              service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              2. Description of Service
            </h2>
            <p className="text-muted-foreground mb-4">
              ChatOkay is an AI-powered appointment assistant for businesses
              that provides automated appointment scheduling, chat services, and
              calendar management tools. Our service integrates with third-party
              platforms including Google Calendar, Telegram, and WhatsApp to
              help businesses manage appointments efficiently.
            </p>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h3 className="text-lg font-medium mb-2">
                Google Calendar Integration
              </h3>
              <p className="text-muted-foreground text-sm mb-2">
                ChatOkay uses Google Calendar API to provide calendar
                synchronization features. By using this service:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                <li>
                  You grant ChatOkay permission to access and manage your Google
                  Calendar data
                </li>
                <li>
                  We will only access calendar information necessary to provide
                  appointment scheduling services
                </li>
                <li>
                  All data access is performed in accordance with Google's API
                  Services User Data Policy
                </li>
                <li>
                  You may revoke access at any time through your Google account
                  settings
                </li>
              </ul>
              <p className="text-muted-foreground text-sm mt-2">
                Our use of information received from Google APIs adheres to the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  className="text-primary underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
            </div>
            <p className="text-muted-foreground mt-4">
              The service is provided "as is" and we reserve the right to modify
              or discontinue the service at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Account Creation</h3>
                <p className="text-muted-foreground">
                  You must provide accurate and complete information when
                  creating an account. You are responsible for maintaining the
                  confidentiality of your account credentials.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">Account Security</h3>
                <p className="text-muted-foreground">
                  You are responsible for all activities that occur under your
                  account. You must notify us immediately of any unauthorized
                  use of your account.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Account Termination
                </h3>
                <p className="text-muted-foreground">
                  We reserve the right to suspend or terminate your account at
                  any time for violation of these terms or for any other reason
                  at our sole discretion.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Permitted Uses</h3>
                <p className="text-muted-foreground">
                  You may use our service for lawful business and personal
                  communication purposes only.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Prohibited Activities
                </h3>
                <p className="text-muted-foreground mb-2">You agree not to:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    Use the service for any illegal or unauthorized purpose
                  </li>
                  <li>
                    Transmit any harmful, threatening, or offensive content
                  </li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Interfere with or disrupt the service or servers</li>
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Spam or send unsolicited communications</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              5. Content and Intellectual Property
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Your Content</h3>
                <p className="text-muted-foreground">
                  You retain ownership of content you create and share through
                  our service. By using our service, you grant us a license to
                  use, store, and process your content as necessary to provide
                  the service.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">Our Content</h3>
                <p className="text-muted-foreground">
                  The service and its original content, features, and
                  functionality are owned by ChatOkay and are protected by
                  international copyright, trademark, and other intellectual
                  property laws.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              6. Privacy and Data Protection
            </h2>
            <p className="text-muted-foreground">
              Your privacy is important to us. Please review our Privacy Policy,
              which also governs your use of the service, to understand our
              practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              7. Service Availability
            </h2>
            <p className="text-muted-foreground">
              We strive to maintain high service availability but do not
              guarantee uninterrupted access. We may perform maintenance,
              updates, or modifications that temporarily affect service
              availability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              8. Limitation of Liability
            </h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, ChatOkay shall not be
              liable for any indirect, incidental, special, consequential, or
              punitive damages, including without limitation, loss of profits,
              data, use, goodwill, or other intangible losses.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to defend, indemnify, and hold harmless ChatOkay and its
              officers, directors, employees, and agents from and against any
              claims, damages, obligations, losses, liabilities, costs, or debt.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Governing Law</h2>
            <p className="text-muted-foreground">
              These terms shall be governed by and construed in accordance with
              the laws of [Your Jurisdiction], without regard to its conflict of
              law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              11. Changes to Terms
            </h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. We will
              notify users of any material changes by posting the new terms on
              this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              12. Contact Information
            </h2>
            <p className="text-muted-foreground">
              If you have any questions about these Terms of Service, please
              contact us at:
            </p>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="font-medium">Email: chatokay.dev@gmail.com</p>
              <p className="text-sm text-muted-foreground mt-1">
                Para consultas legales o sobre el uso de nuestras integraciones
                con Google Calendar
              </p>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
