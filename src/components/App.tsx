import { Header } from './Header';
import { Intro } from './Intro';
import { Footer } from './Footer';
import Results from './Form/Results';
import Form from './Form/Form';
import ComplianceProfileProvider from '../providers/ComplianceProfileProvider';
import ThemeProvider from '../providers/ThemeProvider';
import './styles.css';



const App = () => {
  return (
    <ThemeProvider>
      <Header />
      <main className='container main'>
        <Intro />
        <ComplianceProfileProvider>
          <Form />
          <Results />
        </ComplianceProfileProvider>
        <Footer />
      </main>
    </ThemeProvider>
  );
};

export default App;
