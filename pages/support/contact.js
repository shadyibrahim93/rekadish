import Head from 'next/head';
import SideBar from '../../components/SideBar';
import Contact from '../../components/ContactUs';
import { BRAND_NAME } from '../../lib/constants';

export default function ContactPage() {
  return (
    <div className='vr-page'>
      <Head>
        <title>{`${BRAND_NAME} — Contact`}</title>
      </Head>

      <div className='vr-layout'>
        <div className='vr-layout__main'>
          <section className='vr-card'>
            <Contact />
          </section>
        </div>

        <SideBar />
      </div>
    </div>
  );
}
