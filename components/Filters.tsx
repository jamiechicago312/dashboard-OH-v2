interface FiltersProps {
  onRepoChange: (repos: string) => void;
  onLabelChange: (labels: string) => void;
  onAgeChange: (age: string) => void;
  repos: string;
  labels: string;
  age: string;
}

export default function Filters({ 
  onRepoChange, 
  onLabelChange, 
  onAgeChange, 
  repos, 
  labels, 
  age 
}: FiltersProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Filters</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="repos" className="block text-sm font-medium text-gray-700 mb-1">
            Repositories
          </label>
          <input
            type="text"
            id="repos"
            value={repos}
            onChange={(e) => onRepoChange(e.target.value)}
            placeholder="e.g., All-Hands-AI/OpenHands"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Comma-separated list of owner/repo
          </p>
        </div>
        
        <div>
          <label htmlFor="labels" className="block text-sm font-medium text-gray-700 mb-1">
            Labels
          </label>
          <input
            type="text"
            id="labels"
            value={labels}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="e.g., bug, enhancement"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Comma-separated list of labels
          </p>
        </div>
        
        <div>
          <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
            Age Range
          </label>
          <select
            id="age"
            value={age}
            onChange={(e) => onAgeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All ages</option>
            <option value="0-24">0-24 hours</option>
            <option value="24-48">24-48 hours</option>
            <option value="48-96">48-96 hours</option>
            <option value="96+">96+ hours</option>
          </select>
        </div>
      </div>
    </div>
  );
}