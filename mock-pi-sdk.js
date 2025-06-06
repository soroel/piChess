// Mock Pi SDK for local development
console.log('Loading Mock Pi SDK');

window.Pi = (function() {
  // Store incomplete payments for testing
  const incompletePayments = new Map();
  
  // Mock payment data matching the PaymentDTO type
  function createMockPayment(paymentData) {
    const paymentId = 'payment-' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    
    return {
      identifier: paymentId,
      user_uid: 'user-' + Math.random().toString(36).substr(2, 9),
      amount: paymentData.amount,
      memo: paymentData.memo,
      metadata: paymentData.metadata,
      from_address: 'mock-from-address',
      to_address: 'mock-to-address',
      direction: 'user_to_app',
      created_at: now,
      network: 'Pi Testnet',
      status: {
        developer_approved: false,
        transaction_verified: false,
        developer_completed: false,
        cancelled: false,
        user_cancelled: false
      },
      transaction: null
    };
  }
  
  return {
    version: '2.0',
    sandbox: true,
    
    init: function(config) {
      console.log('Mock Pi SDK initialized with config:', config);
      return Promise.resolve();
    },
    
    authenticate: function(scopes, onIncompletePaymentFound) {
      console.log('Mock authenticate called with scopes:', scopes);
      
      // Check for incomplete payments
      if (incompletePayments.size > 0) {
        const payment = Array.from(incompletePayments.values())[0];
        console.log('Found incomplete payment:', payment);
        if (typeof onIncompletePaymentFound === 'function') {
          onIncompletePaymentFound(payment);
        }
      }
      
      // Simulate successful authentication
      return Promise.resolve({
        accessToken: 'mock-access-token-' + Math.random().toString(36).substr(2, 9),
        user: {
          uid: 'user-' + Math.random().toString(36).substr(2, 9),
          username: 'mockuser' + Math.floor(Math.random() * 1000),
          ...(scopes.includes('payments') && { payments: [] }),
          ...(scopes.includes('wallet_address') && { wallet_address: 'mock-wallet-address' })
        }
      });
    },
    
    createPayment: function(paymentData, callbacks = {}) {
      console.log('Mock createPayment called with data:', paymentData);
      
      // Create mock payment
      const payment = createMockPayment(paymentData);
      incompletePayments.set(payment.identifier, payment);
      
      // Simulate payment flow
      setTimeout(() => {
        try {
          // Update payment status
          payment.status.developer_approved = true;
          
          if (typeof callbacks.onReadyForServerApproval === 'function') {
            callbacks.onReadyForServerApproval(payment.identifier);
          }
          
          // Simulate blockchain confirmation
          setTimeout(() => {
            payment.transaction = {
              txid: 'mock-txid-' + Math.random().toString(36).substr(2, 9),
              verified: true,
              _link: 'https://testnet.minepi.com/explorer/tx/' + Math.random().toString(36).substr(2, 9)
            };
            payment.status.transaction_verified = true;
            
            if (typeof callbacks.onReadyForServerCompletion === 'function') {
              callbacks.onReadyForServerCompletion(
                payment.identifier, 
                payment.transaction.txid
              );
            }
            
            // Mark as complete
            payment.status.developer_completed = true;
            incompletePayments.delete(payment.identifier);
            
          }, 1500);
          
        } catch (error) {
          console.error('Error in payment callbacks:', error);
          if (typeof callbacks.onError === 'function') {
            callbacks.onError(new Error('Error in payment processing'), payment);
          }
        }
      }, 1000);
      
      return {
        _handleServerAuthorization: function(paymentId, txid) {
          console.log('Mock payment completed', { paymentId, txid });
          return Promise.resolve({ success: true });
        }
      };
    },
    
    logout: function() {
      console.log('Mock logout called');
      return Promise.resolve();
    },
    
    // Additional Pi SDK methods
    nativeFeaturesList: function() {
      return Promise.resolve(["inline_media", "request_permission"]);
    },
    
    openShareDialog: function(title, message) {
      console.log('Mock share dialog:', { title, message });
      return Promise.resolve();
    },
    
    openUrlInSystemBrowser: function(url) {
      console.log('Mock opening URL in system browser:', url);
      window.open(url, '_blank');
      return Promise.resolve();
    },
    
    // Mock Ads API
    Ads: {
      showAd: function(adType) {
        console.log('Mock showing ad:', adType);
        return Promise.resolve({
          type: adType,
          result: adType === 'rewarded' ? 'AD_REWARDED' : 'AD_CLOSED',
          adId: 'mock-ad-id'
        });
      },
      
      isAdReady: function(adType) {
        return Promise.resolve({
          type: adType,
          ready: true
        });
      },
      
      requestAd: function(adType) {
        return Promise.resolve({
          type: adType,
          result: 'AD_LOADED'
        });
      }
    },
    
    // For testing
    _mock: {
      clearIncompletePayments: function() {
        incompletePayments.clear();
      },
      
      createIncompletePayment: function(paymentData) {
        const payment = createMockPayment(paymentData);
        incompletePayments.set(payment.identifier, payment);
        return payment;
      }
    }
  };
})();

console.log('Mock Pi SDK loaded');
