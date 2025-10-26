import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

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
              6. Third-Party Services
            </h2>
            <p className="text-muted-foreground">
              Our services may integrate with third-party services. We are not
              responsible for the privacy practices of these third parties. We
              encourage you to review their privacy policies.
            </p>
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
              <p>Email: privacy@chatokay.com</p>
              <p>Address: Baker Street, 12, Wayne, EE. UU.</p>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
