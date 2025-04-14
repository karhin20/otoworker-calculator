import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

/**
 * Helper component for assigning Developer role
 * 
 * This component is for development purposes only and should be
 * removed in production. It provides a simple way to update a user's
 * role to Developer for testing the performance monitor.
 */
const DeveloperRoleHelper: React.FC = () => {
  const [email, setEmail] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleAssignRole = async () => {
    if (!email || !secretCode) {
      toast({
        title: 'Error',
        description: 'Please provide both email and secret code',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Replace this URL with your actual backend endpoint
      const response = await fetch('/api/admin/developer-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          secretCode,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update role');
      }
      
      toast({
        title: 'Success',
        description: `${email} has been assigned the Developer role`,
      });
      
      // Clear form
      setEmail('');
      setSecretCode('');
      
    } catch (error) {
      console.error('Error assigning role:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update role',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="p-4 max-w-md mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4">Assign Developer Role</h2>
      <div className="space-y-4">
        <div>
          <Label htmlFor="email">Admin Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter admin email"
          />
        </div>
        
        <div>
          <Label htmlFor="secretCode">Secret Code</Label>
          <Input
            id="secretCode"
            type="password"
            value={secretCode}
            onChange={(e) => setSecretCode(e.target.value)}
            placeholder="Enter secret code"
          />
        </div>
        
        <Button 
          onClick={handleAssignRole} 
          disabled={isLoading || !email || !secretCode}
          className="w-full"
        >
          {isLoading ? 'Processing...' : 'Assign Developer Role'}
        </Button>
        
        <div className="text-xs text-gray-500 italic mt-2">
          This utility is for development purposes only. The Developer role
          allows access to the performance monitoring tools.
        </div>
      </div>
    </Card>
  );
};

export default DeveloperRoleHelper; 