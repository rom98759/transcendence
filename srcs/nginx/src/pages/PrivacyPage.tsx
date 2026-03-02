import { useTranslation } from 'react-i18next';
import { Page } from '../components/organisms/PageContainer';
import Scrollable from '../components/atoms/Scrollable';
import type { HTMLAttributes, ReactNode, FC } from 'react';

const PrivacyPage = () => {
  const { t } = useTranslation();
  const H2 = ({ children }: { children: ReactNode }) => (
    <h2 className="text-xl mb-1 font-semibold">{children}</h2>
  );
  const H3 = ({ children }: { children: ReactNode }) => (
    <h3 className="text-md font-semibold">{children}</h3>
  );
  const P = ({ children }: { children: ReactNode }) => (
    <p className="text-md text-gray-700 mb-1 ">{children}</p>
  );

  interface LegalSectionProps extends HTMLAttributes<HTMLElement> {
    children: ReactNode;
  }

  const LegalSection: FC<LegalSectionProps> = ({ children, className = '', ...rest }) => (
    <section {...rest} className={`w-full flex flex-col my-2 text-justify ${className}`}>
      {children}
    </section>
  );

  return (
    <Page>
      <Scrollable className="md:mt-15">
        <h1 className="text-3xl mb-4 font-bold text-center">{t('privacy_policy.title')}</h1>
        <p className="text-center text-gray-500 mb-6">
          <i>{t('privacy_policy.last_updated')}</i>
        </p>

        <section className="mb-8">
          <p className="text-justify">
            {t('privacy_policy.intro', { companyName: t('companyName') })}
          </p>
        </section>

        <LegalSection>
          <H2>{t('privacy_policy.summary.title')}</H2>
          <P>{t('privacy_policy.summary.description')}</P>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>{t('privacy_policy.summary.personal_info.title')}</strong>
              <P>{t('privacy_policy.summary.personal_info.description')}</P>
            </li>
            <li>
              <strong>{t('privacy_policy.summary.sensitive_info.title')}</strong>
              <P>{t('privacy_policy.summary.sensitive_info.description')}</P>
            </li>
            <li>
              <strong>{t('privacy_policy.summary.third_party.title')}</strong>
              <P>{t('privacy_policy.summary.third_party.description')}</P>
            </li>
            <li>
              <strong>{t('privacy_policy.summary.how_process.title')}</strong>
              <P>{t('privacy_policy.summary.how_process.description')}</P>
            </li>
            <li>
              <strong>{t('privacy_policy.summary.share_info.title')}</strong>
              <P>{t('privacy_policy.summary.share_info.description')}</P>
            </li>
            <li>
              <strong>{t('privacy_policy.summary.your_rights.title')}</strong>
              <P>{t('privacy_policy.summary.your_rights.description')}</P>
            </li>
          </ul>
        </LegalSection>

        <LegalSection>
          <H2>{t('privacy_policy.table_of_contents')}</H2>
          <ul className="list pl-6 space-y-2">
            <li>
              <a href="#infocollect">{t('privacy_policy.toc.info_collect')}</a>
            </li>
            <li>
              <a href="#infouse">{t('privacy_policy.toc.info_use')}</a>
            </li>
            <li>
              <a href="#whoshare">{t('privacy_policy.toc.who_share')}</a>
            </li>
            <li>
              <a href="#cookies">{t('privacy_policy.toc.cookies')}</a>
            </li>
            <li>
              <a href="#sociallogins">{t('privacy_policy.toc.social_logins')}</a>
            </li>
            <li>
              <a href="#intltransfers">{t('privacy_policy.toc.intl_transfers')}</a>
            </li>
            <li>
              <a href="#inforetain">{t('privacy_policy.toc.info_retain')}</a>
            </li>
            <li>
              <a href="#infominors">{t('privacy_policy.toc.info_minors')}</a>
            </li>
            <li>
              <a href="#privacyrights">{t('privacy_policy.toc.privacy_rights')}</a>
            </li>
            <li>
              <a href="#DNT">{t('privacy_policy.toc.dnt')}</a>
            </li>
            <li>
              <a href="#policyupdates">{t('privacy_policy.toc.policy_updates')}</a>
            </li>
            <li>
              <a href="#contact">{t('privacy_policy.toc.contact')}</a>
            </li>
          </ul>
        </LegalSection>

        <LegalSection id="infocollect">
          <H2>{t('privacy_policy.info_collect.title')}</H2>
          <H3>{t('privacy_policy.info_collect.personal_info.title')}</H3>
          <P>{t('privacy_policy.info_collect.personal_info.description')}</P>
          <H3>{t('privacy_policy.info_collect.auto_collect.title')}</H3>
          <P>{t('privacy_policy.info_collect.auto_collect.description')}</P>
        </LegalSection>

        <LegalSection id="infouse">
          <H2>{t('privacy_policy.info_use.title')}</H2>
          <P>{t('privacy_policy.info_use.description')}</P>
        </LegalSection>

        <LegalSection id="whoshare">
          <H2>{t('privacy_policy.who_share.title')}</H2>
          <P>{t('privacy_policy.who_share.description')}</P>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t('privacy_policy.who_share.business_transfers')}</li>
            <li>{t('privacy_policy.who_share.affiliates')}</li>
            <li>{t('privacy_policy.who_share.business_partners')}</li>
          </ul>
        </LegalSection>

        <LegalSection id="cookies">
          <H2>{t('privacy_policy.cookies.title')}</H2>
          <P>{t('privacy_policy.cookies.description')}</P>
        </LegalSection>

        <LegalSection id="sociallogins">
          <H2>{t('privacy_policy.social_logins.title')}</H2>
          <P>{t('privacy_policy.social_logins.description')}</P>
        </LegalSection>

        <LegalSection id="intltransfers">
          <H2>{t('privacy_policy.intl_transfers.title')}</H2>
          <P>{t('privacy_policy.intl_transfers.description')}</P>
        </LegalSection>

        <LegalSection id="inforetain">
          <H2>{t('privacy_policy.info_retain.title')}</H2>
          <P>{t('privacy_policy.info_retain.description')}</P>
        </LegalSection>

        <LegalSection id="infominors">
          <H2>{t('privacy_policy.info_minors.title')}</H2>
          <P>{t('privacy_policy.info_minors.description')}</P>
        </LegalSection>

        <LegalSection id="privacyrights">
          <H2>{t('privacy_policy.privacy_rights.title')}</H2>
          <P>{t('privacy_policy.privacy_rights.description')}</P>
          <P>
            {t('privacy_policy.privacy_rights.withdraw_consent', {
              email: t('email'),
            })}
          </P>
        </LegalSection>

        <LegalSection id="DNT">
          <H2>{t('privacy_policy.dnt.title')}</H2>
          <P>{t('privacy_policy.dnt.description')}</P>
        </LegalSection>

        <LegalSection id="policyupdates">
          <H2>{t('privacy_policy.policy_updates.title')}</H2>
          <P>{t('privacy_policy.policy_updates.description')}</P>
        </LegalSection>

        <LegalSection id="contact">
          <H2>{t('privacy_policy.contact.title')}</H2>
          <P>
            {t('privacy_policy.contact.description', {
              companyName: t('companyName'),
              address: t('address'),
              email: t('email'),
            })}
          </P>
        </LegalSection>
      </Scrollable>
    </Page>
  );
};

export default PrivacyPage;
