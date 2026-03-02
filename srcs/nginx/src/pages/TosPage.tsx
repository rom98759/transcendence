import { useTranslation } from 'react-i18next';
import { Page } from '../components/organisms/PageContainer';
import Scrollable from '../components/atoms/Scrollable';
import type { ReactNode } from 'react';

const TosPage = () => {
  const { t } = useTranslation();
  const H2 = ({ children }: { children: ReactNode }) => (
    <h2 className="text-xl mb-1 font-semibold">{children}</h2>
  );
  const P = ({ children }: { children: ReactNode }) => (
    <p className="text-sm text-gray-700 mb-1 whitespace-pre-line">{children}</p>
  );

  const LegalSection = ({ children }: { children: ReactNode }) => (
    <section className="w-full flex flex-col my-2 px-3 py-1 text-justify">{children}</section>
  );

  return (
    <Page>
      <Scrollable className="md:mt-15 w-[90%]">
        <h1 className="text-3xl mb-2 font-bold">{t('tos.title')}</h1>
        <p>
          <i>{t('tos.last_updated')}</i>
        </p>
        <p>{t('tos.provider', { companyName: t('companyName'), address: t('address') })}</p>
        <p>{t('tos.contact_info', { email: t('email'), phone: '01 02 03 04 05' })}</p>
        <LegalSection>
          <H2>{t('tos.agreement')}</H2>
          <P>{t('tos.agreement-text', { serviceName: t('serviceName') })}</P>
        </LegalSection>
        <LegalSection>
          <H2>{t('tos.ip')}</H2>
          <P>{t('tos.ip-text', { companyName: t('companyName') })}</P>
        </LegalSection>

        <LegalSection>
          <H2>{t('tos.responsibilities')}</H2>
          <P>{t('tos.responsibilities-text')}</P>
        </LegalSection>

        <LegalSection>
          <H2>{t('tos.user_content')}</H2>
          <P>{t('tos.user_content-text', { companyName: t('companyName') })}</P>
        </LegalSection>

        <LegalSection>
          <H2>{t('tos.termination')}</H2>
          <P>{t('tos.termination-text')}</P>
        </LegalSection>

        <LegalSection>
          <H2>{t('tos.disclaimers')}</H2>
          <P>{t('tos.disclaimers-text', { companyName: t('companyName') })}</P>
        </LegalSection>

        <LegalSection>
          <H2>{t('tos.privacy')}</H2>
          <P>{t('tos.privacy-text', { privacyPolicyLink: t('privacyPolicyLink') })}</P>
        </LegalSection>

        <LegalSection>
          <H2>{t('tos.law')}</H2>
          <P>
            {t('tos.law-text', {
              governingLaw: t('governingLaw'),
              arbitrationLocation: t('arbitrationLocation'),
            })}
          </P>
        </LegalSection>
        <LegalSection>
          <H2>{t('tos.contact')}</H2>
          <P>
            {t('tos.contact-text', {
              companyName: t('companyName'),
              address: t('address'),
              email: t('email'),
              phone: '01 00 01 00 11',
            })}
          </P>
        </LegalSection>
      </Scrollable>
    </Page>
  );
};

export default TosPage;
