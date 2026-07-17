import CharacterChat from "./components/CharacterChat";
import CharacterChecklist from "./components/CharacterChecklist";
import MoodboardCanvas from "./components/MoodboardCanvas";
import ReferenceSearch from "./components/ReferenceSearch";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <MoodboardCanvas />
    </div>
  );
}
