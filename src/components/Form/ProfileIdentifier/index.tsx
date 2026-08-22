import React, { useEffect, useRef, useState } from 'react';

export interface ProfileIdentifierProps {
  disabled?: boolean;
  clientName: string;
  preperName: string;
  logoImg: File | null;
  handleClientNameChange: (value: string) => void;
  handlePreperNameChange: (value: string) => void;
  handleLogoImgChange: (file: File | null) => void;
}
//TODO: Update to work with ~/data/form-schema.json 's profileIdentifiers
export const ProfileIdentifier: React.FC<ProfileIdentifierProps> = ({
  disabled = false,
  // clientName = '',
  // preperName = '',
  logoImg = null,
  handleClientNameChange,
  handlePreperNameChange,
  handleLogoImgChange,
}: ProfileIdentifierProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null); //ref of hidden input file element
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const triggerFileInput = () => { fileInputRef.current?.click(); }; // Forwards custom button click to hidden input

  useEffect(() => {
    if (!logoImg) {
      setPreviewUrl(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      setPreviewUrl(typeof result === 'string' ? result : null);
    };
    reader.onerror = () => {
      setPreviewUrl(null);
    };
    reader.readAsDataURL(logoImg);
  }, [logoImg]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleLogoImgChange(files[0]);
    }
  };

  const removeLogoImg = () => {
    handleLogoImgChange(null);
    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input element
  };

  return disabled ? '' : (
    <div className='profile-identifier' >
      <div className="profile-identifier-field">
        <label 
          className="profile-identifier-label" 
          htmlFor="company_name">
            Client name 
            <span className="optional">(optional)</span>
        </label>
        <input
          type="text"
          id="company_name"
          name="company_name"
          className="profile-identifier-input"
          placeholder="Client or organization name"
          onChange={(e) => { handleClientNameChange(e.target.value); }}>
        </input>
      </div>
      <div className="profile-identifier-field">
        <label 
          className="profile-identifier-label"
          htmlFor="msp_name">
            Prepared By <span className="optional">(optional)</span>
        </label>
        <input
          type="text"
          id="msp_name"
          name="msp_name"
          className="profile-identifier-input"
          placeholder="Your firm or MSP name"
          onChange={(e) => { handlePreperNameChange(e.target.value); }}>
        </input>
      </div>
      <div className="profile-identifier-field profile-identifier-logo">
        <label className="profile-identifier-label" htmlFor='logo'>
          Logo <span className="optional">(optional)</span>
        </label>

        <div className="logo-control">
          {/* Hidden native input */}
          <input
            name="logo"
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={onFileChange}
            style={{ display: 'none' }}
          />

          {/* Upload Button: Hidden if an image exists */}
          {!logoImg && (
            <button
              type="button"
              className="btn btn-ghost btn-small logo-upload-btn"
              onClick={triggerFileInput}
            >
              Upload
            </button>
          )}

          {/* Preview Container: Only shown if an image exists */}
          {logoImg && previewUrl && (
            <div className="logo-preview">
              <img
                src={previewUrl}
                alt="Logo preview"
                style={{ width: '50px', height: '50px', objectFit: 'cover' }} // Adjust to your styles
              />
              <button
                type="button"
                className="logo-remove"
                onClick={removeLogoImg}
                aria-label="Remove logo"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileIdentifier;