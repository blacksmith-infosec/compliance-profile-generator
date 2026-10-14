export const Intro = () => {
  return (
    <section className='intro'>
      <h1 className='intro-title'>What applies to
        <span className='accent-text'> this </span>
        client
        <span className='accent-text'>.</span>
      </h1>
      <p className='intro-lede'>
        Answer a short profile and get a ranked list of compliance frameworks and regulations the
        organization likely needs to address. Built for MSPs, vCISOs, and auditors who need a
        defensible starting point in minutes, not days.
      </p>
      <p className='intro-note'>
        Choose Unknown when an answer needs verification. Your profile will flag possible frameworks
        and include follow-ups with owners. Choose None or No only when you have confirmed it.
      </p>
      <p className='intro-note'>
        This is an indicative tool. It does not constitute legal advice.
        Verify obligations with qualified counsel before making compliance decisions.
      </p>
  </section>
  );
};
