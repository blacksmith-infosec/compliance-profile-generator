import React from 'react';
import { EvaluatedFramework, useComplianceProfile } from '../../../providers/ComplianceProfileProvider';
import { useTheme } from '../../../providers/ThemeProvider';

const FrameworkList: React.FC<{ title: string; items: EvaluatedFramework[] }> = ({ title, items }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="results-group">
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
  const { theme } = useTheme();

  if (!hasGeneratedProfile) {
    return (
      <section className="results-placeholder">
        {theme === 'light' ?
            <img className="placeholder-mark placeholder-mark-light" 
                 src="assets/Dark_Blue.svg" 
                 alt="Blacksmith logo" /> 
            : 
            <img className="placeholder-mark placeholder-mark-dark" 
                 src="assets/Bright_Blue.svg" 
                 alt="Blacksmith logo" />
          }
        {/* <h2>Results</h2> */}
        {allSectionsComplete
        ? <p className="placeholder-text">Click Generate Profile to view applicable frameworks.</p>
        : <p className="placeholder-text">Complete the form to generate a list of likely applicable frameworks and regulations.</p>}
      </section>
    );
  }

  const totalMatches = profile.definite.length + profile.likely.length + profile.consider.length;

  if (totalMatches === 0) {
    return (
      <section className="results-placeholder">
        <h2>Results</h2>
        <p>Complete the form to generate recommended compliance frameworks.</p>
      </section>
    );
  }

  return (
    <section className="results-panel">
      <h2 className="results-title">Results</h2>
      <FrameworkList title="Definite" items={profile.definite} />
      <FrameworkList title="Likely" items={profile.likely} />
      <FrameworkList title="Consider" items={profile.consider} />
    </section>
  );
};

export default Results;