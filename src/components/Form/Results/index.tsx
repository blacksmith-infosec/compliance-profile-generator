import React from 'react';
import { EvaluatedFramework } from '../../../types/profileResults';
import { useComplianceProfile } from '../../../providers/ComplianceProfileProvider';
import { downloadProfilePDF } from '../../../modules/pdf';

const tierLabels = { definite: 'Definite', likely: 'Likely', consider: 'Consider' };

const PendingMatches: React.FC<{ framework: EvaluatedFramework }> = ({ framework }) => (
  <>
    {framework.pendingMatches?.map((pending, index) => (
      <div className='framework-pending' key={`${framework.id}-pending-${index}`}>
        <p>Would qualify as <strong>{tierLabels[pending.level]}</strong> if all of these answers are confirmed:</p>
        <ul>
          {pending.conditions.map((condition) => (
            <li key={condition.fieldId}>
              <strong>{condition.fieldLabel}</strong>: {condition.expectedLabels.join(' or ')}
            </li>
          ))}
        </ul>
        <p className='conditional-reason'>Reason if confirmed: {pending.reason}</p>
      </div>
    ))}
  </>
);

const FrameworkList: React.FC<{ title: string; items: EvaluatedFramework[] }> = ({ title, items }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className='results-group'>
      <h3>{title}</h3>
      {title === 'Possible' && (
        <p className='results-explanation'>
          These frameworks depend on unknown answers. Verify the conditions below before treating them as applicable.
        </p>
      )}
      {items.map((framework) => (
        <div className={'framework-card '+title.toLowerCase()} key={framework.id}>
          <p className='framework-name'>{framework.name}</p>
          {framework.matchLevel !== 'possible' && <p>{framework.matchReason}</p>}
          <PendingMatches framework={framework} />
          {framework.matchLevel === 'possible' && framework.first_steps.length > 0 && (
            <p className='first-steps-label'>If confirmed, where to start</p>
          )}
          <ol>{framework.first_steps.map((step) => <li key={`${framework.id}-${step}`}>{step}</li>)}</ol>
        </div>
      ))}
    </section>
  );
};

const Results: React.FC = () => {
  const {
    profile,
    hasGeneratedProfile,
    allSectionsComplete,
    handleFollowUpOwnerChange,
    handleReviewerQuestionsChange,
  } = useComplianceProfile();
  const handleReviewerQuestionsInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    handleReviewerQuestionsChange(event.target.value);
  };

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

  const possible = profile.possible ?? [];
  const followUps = profile.followUps ?? [];
  const totalMatches = profile.definite.length + profile.likely.length + profile.consider.length;
  const frameworkNames = new Map(
    [...profile.definite, ...profile.likely, ...profile.consider, ...possible]
      .map((framework) => [framework.id, framework.name]),
  );

  if (totalMatches === 0 && possible.length === 0 && followUps.length === 0) {
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
      {followUps.length > 0 && (
        <p className='results-explanation'>
          Unknown answers remain open questions, so this profile is provisional. Assign an owner to each follow-up,
          verify the answer, then update the form and generate the profile again.
        </p>
      )}
      {totalMatches === 0 && (
        <p>No frameworks have been identified from known answers yet.</p>
      )}
      <FrameworkList title='Definite' items={profile.definite} />
      <FrameworkList title='Likely' items={profile.likely} />
      <FrameworkList title='Possible' items={possible} />
      <FrameworkList title='Consider' items={profile.consider} />
      {followUps.length > 0 && (
        <section className='results-group results-follow-ups' aria-labelledby='follow-ups-heading'>
          <h3 id='follow-ups-heading'>Follow-up items</h3>
          <p className='results-explanation'>
            Suggested owners are editable. Owner changes are included in the PDF immediately.
          </p>
          {followUps.map((followUp) => (
            <div className='follow-up-card' key={followUp.fieldId}>
              <h4>{followUp.fieldLabel}</h4>
              <p className='follow-up-status'>Answer: Unknown</p>
              <p>{followUp.action}</p>
              {followUp.frameworkIds.length > 0 && (
                <p className='follow-up-frameworks'>
                  May affect: {followUp.frameworkIds.map((id) => frameworkNames.get(id) ?? id).join(', ')}
                </p>
              )}
              <label className='field-label' htmlFor={`follow-up-owner-${followUp.fieldId}`}>
                Owner for {followUp.fieldLabel}
              </label>
              <input
                id={`follow-up-owner-${followUp.fieldId}`}
                className='follow-up-owner'
                type='text'
                value={followUp.owner}
                placeholder='Assign a person or role'
                onChange={(event) => handleFollowUpOwnerChange?.(followUp.fieldId, event.target.value)}
              />
            </div>
          ))}
        </section>
      )}
      <div className='reviewer-questions'>
        <label className='field-label' htmlFor='reviewer-questions'>Reviewer’s unresolved questions</label>
        <p className='results-explanation' id='reviewer-questions-help'>
          Questions are included in the PDF. Leave blank for space to write questions during review.
        </p>
        <textarea
          id='reviewer-questions'
          className='reviewer-questions-input'
          aria-describedby='reviewer-questions-help'
          rows={4}
          value={profile.reviewerQuestions ?? ''}
          onChange={handleReviewerQuestionsInputChange}
        />
      </div>
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
