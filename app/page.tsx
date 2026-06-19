import { Metadata } from 'next';
import HomePage from './HomePage';

export const metadata: Metadata = {
  other: {
    'base:app_id': '6a344a1ec14c8a65a9c38948',
  },
};

export default function Home() {
  return <HomePage />;
}
