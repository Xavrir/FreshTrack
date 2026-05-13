import { render } from '@testing-library/react-native';
import App from './App';

describe('App', () => {
  it('renders correctly', () => {
    const { getByText } = render(<App />);
    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByText('FRESHTRACK')).toBeTruthy();
  });
});
