import React, { useState } from 'react';
import { HiExclamationTriangle, HiChevronDown, HiChevronUp, HiXMark } from 'react-icons/hi2';

interface FirebaseErrorAlertProps {
  message: string;
  onDismiss?: () => void;
}

const FirebaseErrorAlert: React.FC<FirebaseErrorAlertProps> = ({ 
  message, 
  onDismiss 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded-md mb-6 animate-fadeIn">
      <div className="flex justify-between items-start">
        <div className="flex items-start">
          <HiExclamationTriangle className="mt-0.5 mr-2 flex-shrink-0" size={18} />
          <div>
            <p className="font-medium">{message}</p>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-red-300 hover:text-red-100 text-sm mt-1 flex items-center"
            >
              {isExpanded ? 'Hide' : 'Show'} Firebase setup instructions
              {isExpanded ? <HiChevronUp className="ml-1" /> : <HiChevronDown className="ml-1" />}
            </button>
          </div>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-red-300 hover:text-red-100 ml-2">
            <HiXMark size={18} />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-3 border-t border-red-800/50 pt-3 text-sm">
          <h4 className="font-medium mb-2">How to fix:</h4>
          <ol className="list-decimal pl-5 space-y-1 mb-3">
            <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-red-300 hover:text-red-100 underline">Firebase Console</a></li>
            <li>Select your project (noder-3e10b)</li>
            <li>Click on "Firestore Database" in the left sidebar</li>
            <li>Select the "Rules" tab</li>
            <li>Replace the rules with the correct permissions</li>
          </ol>

          <div className="bg-red-900/40 border border-red-800/50 rounded p-3 mb-3 overflow-auto">
            <pre className="text-xs">
              {`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /projects/{projectId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    match /blueprints/{blueprintId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    match /files/{fileId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}`}
            </pre>
          </div>

          <p><span className="font-medium">Note:</span> The app will use local storage until Firebase permissions are fixed.</p>
        </div>
      )}
    </div>
  );
};

export default FirebaseErrorAlert; 