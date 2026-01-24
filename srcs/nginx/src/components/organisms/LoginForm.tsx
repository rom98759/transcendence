import { Input } from '../atoms/Input';

export const LoginForm = () => {
  return (
    <form>
      {<Input customType="username" placeholder="username"></Input>}
      {<Input customType="email" errorMessage="Validation error" placeholder="email"></Input>}
      {<Input customType="password" placeholder="password"></Input>}
    </form>
  );
};
