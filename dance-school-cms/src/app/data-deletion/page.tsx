export default function DataDeletion() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Data Deletion Request</h1>
      
      <div className="prose max-w-none">
        <p className="text-gray-600 mb-6">
          <strong>Last updated:</strong> {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Your Right to Data Deletion</h2>
          <p className="mb-4">
            At Dance More, we respect your privacy and your right to control your personal data. 
            You have the right to request deletion of your personal information at any time.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">What Data We Delete</h2>
          <p className="mb-4">When you request data deletion, we will remove:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Your account information and profile data</li>
            <li>Class booking history and preferences</li>
            <li>Communication records and support tickets</li>
            <li>Any other personal information associated with your account</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data We May Retain</h2>
          <p className="mb-4">
            For legal and business purposes, we may retain certain information for a limited time:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Transaction records (required for tax and accounting purposes)</li>
            <li>Information needed to resolve disputes or enforce agreements</li>
            <li>Data required by law to be retained</li>
            <li>Anonymized data that cannot be linked back to you</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">How to Request Data Deletion</h2>
          <p className="mb-4">
            To request deletion of your data, please contact us using one of the following methods:
          </p>
          
          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
            <p className="mb-2"><strong>Email:</strong> privacy@dancemore.app</p>
            <p className="mb-2"><strong>Subject Line:</strong> Data Deletion Request</p>
            <p className="mb-4"><strong>Required Information:</strong></p>
            <ul className="list-disc pl-6">
              <li>Your full name</li>
              <li>Email address associated with your account</li>
              <li>Reason for deletion request (optional)</li>
              <li>Any additional account identifiers</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Processing Timeline</h2>
          <p className="mb-4">
            We will process your data deletion request within:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>30 days</strong> for standard requests</li>
            <li><strong>60 days</strong> for complex requests requiring additional verification</li>
          </ul>
          <p className="mb-4">
            You will receive a confirmation email once your data has been successfully deleted.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Account Deactivation vs. Data Deletion</h2>
          <div className="bg-yellow-50 p-6 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-3">Important Note</h3>
            <p className="mb-4">
              <strong>Account Deactivation:</strong> Temporarily disables your account but retains your data.
            </p>
            <p className="mb-4">
              <strong>Data Deletion:</strong> Permanently removes your personal information and cannot be undone.
            </p>
            <p>
              Please consider carefully before requesting data deletion, as this action is irreversible.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
          <p className="mb-4">
            If you've used third-party login services (like Facebook or Google), you may also need to:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Revoke app permissions in your Facebook/Google account settings</li>
            <li>Contact those services directly for their data deletion processes</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Questions or Concerns</h2>
          <p className="mb-4">
            If you have any questions about our data deletion process or need assistance, 
            please don't hesitate to contact us:
          </p>
          <p className="mb-4">
            Email: privacy@dancemore.app<br />
            Response time: Within 48 hours
          </p>
        </section>
      </div>
    </div>
  );
}
