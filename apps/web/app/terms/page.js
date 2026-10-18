import Link from 'next/link';
import LegalPage, { Contact, Operator } from '@/components/legal/LegalPage';
import { LEGAL_VERSIONS, legalInfo } from '@/lib/legal';
import { PLANS } from '@otrelink/core';

export const metadata = { title: 'Terms of Service — Otrelink', description: 'The agreement between you and Otrelink.' };

export default function TermsPage() {
  const info = legalInfo();
  return (
    <LegalPage path="/terms" title="Terms of Service" version={LEGAL_VERSIONS.terms}
      intro="These Terms are the agreement between you and Otrelink. They explain what you can expect from us and what we expect from you. Please read them: by creating an account or using Otrelink you accept them.">
      <h2>1. Who we are</h2>
      <p>Otrelink (“Otrelink”, “we”, “us”) is operated by <Operator />. You can reach us at <Contact />.</p>

      <h2>2. Accepting these Terms</h2>
      <p>You accept these Terms, our <Link href="/privacy">Privacy Policy</Link>, our <Link href="/cookies">Cookie Policy</Link> and our <Link href="/refunds">Refund Policy</Link> when you tick the boxes on the sign-up form, or when you accept them later in your dashboard. We keep a record of that acceptance (the version of each document, the date and time, your IP address and your browser) as proof of the agreement.</p>
      <p>If you use Otrelink on behalf of a company or organization, you confirm that you are authorized to accept these Terms for it, and “you” includes that organization.</p>

      <h2>3. Who can use Otrelink</h2>
      <ul>
        <li>You must be at least {info.minAge} years old, or the age of legal majority where you live if it is higher.</li>
        <li>You must be able to enter into a binding contract and not be barred from using the service under the laws that apply to you, including U.S. sanctions and export laws.</li>
        <li>One person or organization may keep several pages within the limits of its plan, but you may not create accounts to get around a suspension or a plan limit.</li>
      </ul>

      <h2>4. Your account</h2>
      <ul>
        <li>Give us accurate information and keep your email address up to date: we use it for important notices about your account, your payments and these Terms.</li>
        <li>Keep your password and API tokens secret. You are responsible for what happens in your account. Tell us right away if you think someone else has accessed it.</li>
        <li>Usernames are first come, first served. We may reclaim a username that impersonates someone, infringes a trademark, is misleading, or has been inactive for a long time, and we will tell you before doing so when we can.</li>
      </ul>

      <h2>5. Your content</h2>
      <p>You own what you add to your pages: text, images, links, products and everything else (“your content”). To run the service we need a license to it: you give Otrelink a worldwide, non-exclusive, royalty-free license to host, store, copy, display, adapt (for example, resize an image or translate the layout to a phone) and distribute your content, only to operate, show and improve Otrelink and to promote your public pages within it. The license ends when you delete the content or your account, except for copies kept in backups for a limited time or where the law requires us to keep them.</p>
      <p>You confirm that you have the rights to everything you publish and that your content and your use of Otrelink follow the law.</p>

      <h2>6. What you may not do</h2>
      <p>You agree not to use Otrelink to:</p>
      <ul>
        <li>break any law, or help others do so;</li>
        <li>publish content that infringes someone’s copyright, trademark, privacy or other rights;</li>
        <li>deceive people: phishing, scams, fake giveaways, impersonation, fake reviews or misleading health or financial claims;</li>
        <li>distribute malware, or links to it, or attack, probe or overload the service or other people’s systems;</li>
        <li>publish child sexual abuse material, content that sexualizes minors, non-consensual intimate images, or content that promotes terrorism or violence against people;</li>
        <li>harass, threaten or dox anyone, or promote hatred against people for who they are;</li>
        <li>sell or promote illegal goods or services, including weapons, drugs, or regulated products without the licenses the law requires;</li>
        <li>send spam, or collect visitors’ data without telling them and getting any consent the law requires;</li>
        <li>scrape, copy or resell the service, or use it to build a competing product, except through our documented API within your plan.</li>
      </ul>
      <p>Adult content must be lawful and use the page’s sensitive-content warning. We may remove content or suspend accounts that break this section (see section 13).</p>

      <h2>7. Your visitors and their data</h2>
      <p>Your pages can collect information from your visitors: bookings, orders, survey answers, reviews, loyalty cards, messages and visit statistics. For that information you are the one who decides why and how it is collected (the “controller”), and Otrelink processes it on your behalf to provide the features you turn on. You agree to:</p>
      <ul>
        <li>tell your visitors who you are and how you use their data, and get any consent the law requires (for example, before sending marketing emails);</li>
        <li>only collect what you need and answer your visitors’ requests to see, correct or delete their data;</li>
        <li>not collect sensitive data (health, financial account numbers, government IDs, children’s data) through Otrelink forms unless the law allows it and you protect it properly.</li>
        <li>if you send push notifications, send only what your sign-up screen promises, keep them honest (no fake urgency, prizes or warnings meant to trick people into tapping), and don’t send content that would break section 6. We may limit how many you send, and pause notifications for pages that receive complaints.</li>
      </ul>
      <p>Our <Link href="/privacy">Privacy Policy</Link> explains how we handle visitor data on our side.</p>

      <h2>8. Plans, payments and automatic renewal</h2>
      <p>Otrelink has a free plan and paid plans. The current prices and what each plan includes are shown on the Plan page of your dashboard before you pay.</p>
      <ul>
        <li><strong>Pro is a subscription that renews automatically every month</strong> at the price shown when you subscribe (currently ${PLANS.pro.price} USD per month, plus any taxes that apply), and you are charged at the start of each monthly period until you cancel.</li>
        <li>Payments are processed by Stripe or PayPal. We do not see or store your full card number. Their terms and privacy policies also apply to the payment.</li>
        <li><strong>You can cancel at any time</strong> online, on the Plan page of your dashboard (the same way you subscribed), with one click. After you cancel, the subscription does not renew and you keep Pro until the end of the period you already paid; then your account moves to the free plan. Nothing you built is deleted.</li>
        <li>If we change the price of your plan, we will tell you by email at least 30 days before the change applies to you, and you can cancel before it does.</li>
        <li>Pro time given for free (for example, through referrals) does not renew into a paid subscription and we never charge you for it.</li>
        <li>Business plans are agreed with us directly and may have their own terms.</li>
        <li>Refunds are covered by our <Link href="/refunds">Refund Policy</Link>.</li>
        <li>If a payment fails, we may retry it and, if it still fails, move your account to the free plan.</li>
      </ul>

      <h2>9. Third-party services</h2>
      <p>Your pages can show content from other services (YouTube, Spotify, Google Maps and others), and Otrelink uses providers to work (hosting, email, payments). We are not responsible for third-party services, their content or their availability, and your use of them is governed by their own terms.</p>

      <h2>10. Our service and our rights</h2>
      <p>Otrelink, its software, design, themes, templates and brand belong to us or our licensors. These Terms do not give you any right to them except to use the service as offered. You may use the templates and themes for your Otrelink pages. If you send us suggestions, we may use them without any obligation to you.</p>
      <p>We keep improving Otrelink, so features may change. If we remove a paid feature that you rely on, we will tell you in advance when we can.</p>

      <h2>11. Copyright complaints</h2>
      <p>We respond to notices of alleged copyright infringement under the U.S. Digital Millennium Copyright Act (DMCA). Send them to <Contact dmca /> with: your contact details; the work you say is infringed; the link to the content on Otrelink; a statement that you believe in good faith the use is not authorized; a statement, under penalty of perjury, that your notice is accurate and that you are the owner or authorized to act for the owner; and your physical or electronic signature. If your content was removed by mistake, you can send us a counter-notice with the information the DMCA requires. We close the accounts of repeat infringers.</p>

      <h2>12. Availability and changes</h2>
      <p>We work to keep Otrelink online and your data safe, but we do not promise that the service will be uninterrupted or free of errors. Keep your own copy of important content: you can export your pages from the dashboard.</p>

      <h2>13. Suspension and termination</h2>
      <ul>
        <li>You can stop using Otrelink and delete your account at any time from your account settings. Deleting the account deletes your pages and their data right away and cancels any subscription (see the <Link href="/refunds">Refund Policy</Link>).</li>
        <li>We may remove content or suspend or close an account that breaks these Terms or the law, that puts other people or the service at risk, or when the law requires it. When we can, we will tell you why and give you a chance to fix the problem or export your content. Serious cases (fraud, malware, abuse of minors, illegal content) can be closed immediately.</li>
        <li>Sections 5 (license for backups), 7, 10, 14, 15, 16 and 17 survive the end of these Terms.</li>
      </ul>

      <h2>14. Disclaimer</h2>
      <p className="legal-caps">Otrelink is provided “as is” and “as available”. To the extent the law allows, we disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose, title and non-infringement. Some places do not allow these exclusions, so they may not apply to you.</p>

      <h2>15. Limitation of liability</h2>
      <p className="legal-caps">To the extent the law allows, Otrelink and its owners, employees and providers will not be liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, revenue, data or goodwill. Our total liability for any claim related to Otrelink is limited to the greater of the amount you paid us in the 12 months before the claim or 100 U.S. dollars.</p>
      <p>Nothing in these Terms limits liability that cannot be limited by law, such as liability for fraud or for gross negligence or willful misconduct.</p>

      <h2>16. Indemnity</h2>
      <p>If someone brings a claim against us because of your content, your pages, your use of visitor data or your breach of these Terms, you agree to defend and compensate us for the reasonable costs, including attorneys’ fees, to the extent the law allows.</p>

      <h2>17. Governing law and disputes</h2>
      <p>These Terms are governed by the laws of the State of {info.state} and the federal laws of the United States, without regard to conflict-of-law rules. Before going to court, contact us at <Contact /> and give us 30 days to try to solve the problem informally. Any dispute that is not solved that way will be decided exclusively by the state or federal courts located in {info.county}, {info.state}, and you and we consent to their jurisdiction. Either party may bring a claim in small claims court if it qualifies. If you are a consumer living in a country whose laws give you the right to sue in your local courts or to rely on mandatory local protections, nothing here takes those rights away.</p>

      <h2>18. Changes to these Terms</h2>
      <p>We may update these Terms. When we make a material change we will tell you by email or in your dashboard at least 30 days before it takes effect, except where a change is required by law or protects against abuse, and we will ask you to accept the new version. If you do not agree, you can cancel and delete your account before the change takes effect.</p>

      <h2>19. Other terms</h2>
      <p>These Terms, together with the policies they link to, are the whole agreement between you and us about Otrelink. If a part is found unenforceable, the rest stays in effect. If we do not enforce a right right away, we do not waive it. You may not transfer these Terms without our consent; we may transfer them with the business. Notices to you are sent to the email on your account.</p>

      <h2>20. Contact</h2>
      <p>Questions about these Terms: <Contact />.</p>
    </LegalPage>
  );
}
