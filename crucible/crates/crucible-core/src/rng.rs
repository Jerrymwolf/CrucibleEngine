//! The single seeded random source. Every random draw in the core goes
//! through this wrapper so the stream is reproducible from the seed alone.

use rand::{Rng, RngCore, SeedableRng};
use rand_chacha::ChaCha20Rng;

/// Deterministic ChaCha20 stream seeded from a u64.
pub struct SimRng {
    inner: ChaCha20Rng,
}

impl SimRng {
    pub fn new(seed: u64) -> Self {
        Self { inner: ChaCha20Rng::seed_from_u64(seed) }
    }

    /// Uniform in [0, 1).
    pub fn unit(&mut self) -> f64 {
        self.inner.gen::<f64>()
    }

    /// Uniform in [lo, hi).
    pub fn range(&mut self, lo: f64, hi: f64) -> f64 {
        lo + (hi - lo) * self.unit()
    }

    /// Uniform index in 0..n (n > 0).
    pub fn index(&mut self, n: usize) -> usize {
        (self.inner.next_u64() % n as u64) as usize
    }

    /// In-place Fisher-Yates shuffle; order depends only on the stream.
    pub fn shuffle<T>(&mut self, items: &mut [T]) {
        for i in (1..items.len()).rev() {
            let j = self.index(i + 1);
            items.swap(i, j);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn same_seed_same_stream() {
        let mut a = SimRng::new(42);
        let mut b = SimRng::new(42);
        for _ in 0..100 {
            assert_eq!(a.unit().to_bits(), b.unit().to_bits());
        }
    }

    #[test]
    fn shuffle_is_permutation() {
        let mut r = SimRng::new(1);
        let mut v: Vec<u32> = (0..20).collect();
        r.shuffle(&mut v);
        v.sort();
        assert_eq!(v, (0..20).collect::<Vec<_>>());
    }
}
