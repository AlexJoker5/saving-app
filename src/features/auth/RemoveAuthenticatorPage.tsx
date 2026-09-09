import { Link, useNavigate, useParams } from 'react-router';
import { useAuthContext } from './hooks/useAuthContext';
import { useAuthAction } from './hooks/useAuthAction';
import { AuthenticatorForm } from './components/AuthenticatorForm';
import { AuthPageFrame } from './components/AuthPageFrame';
import { routePaths } from '../../routes/routePaths';

export function RemoveAuthenticatorPage() {
  const auth = useAuthContext();
  const { factorId } = useParams();
  const navigate = useNavigate();
  const { busy, setBusy, error, act } = useAuthAction();
  const factor = auth.factors.find((item) => item.id === factorId);
  const lastVerified =
    factor?.verified &&
    auth.factors.filter((item) => item.verified).length <= 1;
  const done = () =>
    navigate(routePaths.account, {
      replace: true,
      state: { message: 'Authenticator removed.' },
    });

  return (
    <AuthPageFrame title="Remove authenticator" description={factor?.name}>
      {error && (
        <p className="notice danger" role="alert">
          {error}
        </p>
      )}
      {!factor ? (
        <p className="notice">This authenticator is no longer available.</p>
      ) : lastVerified ? (
        <p className="notice">
          Your account requires an authenticator. Add a backup before removing
          this device.
        </p>
      ) : factor.verified ? (
        <>
          <p>
            Confirm with a current code from this authenticator before removing
            it.
          </p>
          <AuthenticatorForm
            onBusyChange={setBusy}
            label="Verify and remove"
            verify={async (code) => {
              await auth.verify(factor.id, code);
              await auth.removeFactor(factor.id);
              done();
            }}
          />
        </>
      ) : (
        <button
          className="button danger"
          disabled={busy}
          onClick={() =>
            void act(async () => {
              await auth.removeFactor(factor.id);
              done();
            })
          }
        >
          Remove unfinished setup
        </button>
      )}
      {!busy && (
        <Link className="button secondary full-width" to={routePaths.account}>
          Back to account settings
        </Link>
      )}
    </AuthPageFrame>
  );
}
