import React from 'react';
import { EvaluatedFramework } from '../../../types/profileResults';
import { useComplianceProfile } from '../../../providers/ComplianceProfileProvider';
import { downloadProfilePDF } from '../../../modules/pdf';

const FrameworkList: React.FC<{ title: string; items: EvaluatedFramework[] }> = ({ title, items }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className='results-group'>
      <h3>{title}</h3>
        {items.map((framework) => (
          <div className={'framework-card '+title.toLowerCase()} key={framework.id}>
            <p className='framework-name'>{framework.name}</p>
            <p>{framework.matchReason}</p>
            <ol>{framework.first_steps.map((step) => <li key={`${framework.id}-${step}`}>{step}</li>)}</ol>
            {/* <p>{framework.}</p> */}
          </div>
        ))}
    </section>
  );
};

const Results: React.FC = () => {
  const { profile, hasGeneratedProfile, allSectionsComplete } = useComplianceProfile();

  if (!hasGeneratedProfile) {
    return (
      <section className='results-placeholder'>
        <img
          className='brand-mark'
          src='https://assets.blacksmithinfosec.com/images/logos/icon/Bright_Blue.png'
          alt='Blacksmith logo'
        />
        <p className='placeholder-text'>
          {allSectionsComplete
            ? 'Click Generate Profile to view applicable frameworks.'
            : 'Complete the form to generate a list of likely applicable frameworks and regulations.'
          }
        </p>
      </section>
    );
  }

  const totalMatches = profile.definite.length + profile.likely.length + profile.consider.length;

  if (totalMatches === 0) {
    return (
      <section className='results-placeholder'>
        <h2>Results</h2>
        <p>No applicable compliance frameworks were identified for the provided responses.</p>
      </section>
    );
  }

  return (
    <section className='results-panel'>
      <h2 className='results-title'>Results</h2>
      <FrameworkList title='Definite' items={profile.definite} />
      <FrameworkList title='Likely' items={profile.likely} />
      <FrameworkList title='Consider' items={profile.consider} />
      <button
        className='btn btn-primary'
        onClick={() => downloadProfilePDF(profile)}
      >
        Download PDF
      </button>
    </section>
  );
};

export default Results;
