import { useAuth } from "@/contexts/AuthContext";
import asdLogo from "@/assets/asd-logo.png";

const WaitingApproval = () => {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <img src={asdLogo} alt="ASD" className="w-20 h-20 rounded-full mx-auto" />
        <h1 className="text-xl font-bold text-primary">Warte auf Freischaltung</h1>
        <p className="text-muted-foreground text-sm">
          Dein Account ({user?.email}) wurde erstellt, aber noch nicht freigeschaltet.
          Ein Director oder Co-Director muss deinen Zugang genehmigen.
        </p>
        <button onClick={signOut} className="text-sm text-primary hover:underline">
          Abmelden
        </button>
      </div>
    </div>
  );
};

export default WaitingApproval;
