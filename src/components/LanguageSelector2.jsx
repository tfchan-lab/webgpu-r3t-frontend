import { LANGUAGES } from '../utils/languages';

export default function LanguageSelector({ type, onChange, defaultLanguage }) {
  return (
      <select className="border rounded-lg p-2 max-w-[100px] bg-gray-100 dark:bg-white text-black" onChange={onChange} defaultValue={defaultLanguage}>
        {Object.entries(LANGUAGES).map(([key, value]) => {
          return (
            <option key={key} value={value}>
              {key}
            </option>
          );
        })}
      </select>
  );
}
